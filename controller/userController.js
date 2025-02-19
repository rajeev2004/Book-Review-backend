import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
export async function register(req,res){
    const inviteCode=process.env.INVITE_CODE;
    const {name,email,pass,code}=req.body;
    try{
        if(!name || !email || !pass){
            throw new Error('credentials not provided');
        }
        const result=await db.query('select * from users where username=$1 or email=$2',[name,email]);
        if(result.rows.length>0){
            throw new Error('User already exist either with this username or email');
        }
        let role='user';
        if(code && code===inviteCode){
            role='admin';
        }else if(code && code!==inviteCode){
            throw new Error('Code is not correct');
        }
        const hashedPass=await bcrypt.hash(pass,10);
        const response=await db.query('insert into users (username,email,password,role) values($1,$2,$3,$4) RETURNING *',[name,email,hashedPass,role]);
        if(response.rows.length!==1){
            throw new Error('Database server issue, please try again');
        }
        const token=jwt.sign({Id:response.rows[0].id,role:response.rows[0].role},process.env.SECRET_KEY,{expiresIn:'24h'});
        res.status(200).json({message:'user registered',token});
    }catch(err){
        console.error(err);
        res.status(400).json({error:err.message});
    }
}
export async function login(req,res){
    const {email,pass}=req.body;
    try{
        if(!email || !pass){
            throw new Error('credentials not provided');
        }
        const result=await db.query('select * from users where email=$1',[email]);
        if(result.rows.length===0){
            throw new Error('Incorrect email, no user found')
        }
        if(result.rows.length==1){
            const hashedPassword=result.rows[0].password;
            const passwordCompare=await bcrypt.compare(pass,hashedPassword);
            if(!passwordCompare){
                throw new Error('Incorrect password');
            }
            const token=jwt.sign({Id:result.rows[0].id,role:result.rows[0].role},process.env.SECRET_KEY,{expiresIn:'24h'});
            res.status(200).json({message:'login successful',token});
        }
    }catch(err){
        console.error(err);
        res.status(400).json({error:err.message});
    }
}
export async function getBooks(req,res){
    const page=parseInt((req.query.page),10) || 1;
    const limit=5;
    const offset=(page-1)*limit;
    try{
        const result=await db.query('select books.*,COALESCE(ROUND(AVG(reviews.rating),1),0) AS rating  from books left join reviews on books.id=reviews.book_id group by books.id order by created_at DESC limit $1 offset $2',[limit,offset]);
        const nextBooks=await db.query('select * from books limit 1 offset $1',[page*limit]);
        if(nextBooks.rows.length===0){
            return res.status(200).json({books:result.rows,hasMore:false});
        }
        res.status(200).json({books:result.rows,hasMore:true});
    }catch(err){
        console.error(err);
        res.status(500).json({error:'failed to fecth books'});
    }
}
export async function getParticularBook(req,res){
    const {id}=req.params;
    try{
        const result=await db.query('select books.*,COALESCE(ROUND(AVG(reviews.rating),1),0) AS rating  from books left join reviews on books.id=reviews.book_id where books.id=$1 group by books.id',[id]);
        if(result.rows.length===0){
            throw new Error('Cannot fetch book details, please try again!');
        }
        res.status(200).json(result.rows);
    }catch(err){
        console.error(err);
        res.status(500).json({error:err.message});
    }
}
export async function getReviews(req,res){
    const limit=5;
    const {id}=req.params;
    const page=parseInt((req.query.page),10) || 1;
    const offset=(page-1)*limit;
    try{
        const result=await db.query('select r.rating,r.review,r.created_at,u.username from reviews r join users u on r.user_id=u.id where r.book_id=$1 order by created_at DESC limit $2 offset $3',[id,limit,offset]);
        const nextReview=await db.query('select * from reviews limit 1 offset $1',[page*limit]);
        if(nextReview.rows.length>0){
            res.status(200).json({reviews:result.rows,hasMore:true});
        }else{
            res.status(200).json({reviews:result.rows,hasMore:false});
        }
    }catch(err){
        console.error(err);
        res.status(500).json({error:err.message});
    }
}
export async function postReview(req,res){
    const book_id=req.query.book_id;
    const {rating,review,user_id}=req.body;
    const id=parseInt((user_id),10);
    try{
        const result=await db.query('insert into reviews (user_id,book_id,rating,review) values($1,$2,$3,$4) RETURNING *',[id,book_id,rating,review]);
        if(result.rows.length===0){
            throw new Error('Could not post the review, try again');
        }
        res.status(200).json({message:'review posted'});
    }catch(err){
        console.error(err);
        res.status(500).json({error:err.message});
    }
}
export async function Search(req,res){
    const {term}=req.params;
    const searchTerm=term==='all'?'%':term;
    const rating=req.params.rating?parseFloat(req.params.rating):0;
    try{
        const result=await db.query('select books.*,COALESCE(ROUND(AVG(reviews.rating),1),0) AS rating  from books left join reviews on books.id=reviews.book_id where (LOWER(books.title) like $1 or LOWER(books.author) like $1) group by books.id HAVING (COUNT(reviews.rating) > 0 AND AVG(reviews.rating) >= $2) OR ($2 = 0) order by books.created_at DESC LIMIT 10',[`%${searchTerm}%`,rating]);
        res.status(200).json(result.rows);
    }catch(err){
        console.error(err);
        res.status(500).json({error:err.message});
    }
}
export async function getProfile(req,res){
    const {id}=req.params;
    try{
        const result=await db.query('select * from users where id=$1',[id]);
        if(result.rows.length===0){
            throw new Error('Cannot fetch user details. Try again');
        }
        res.status(200).json(result.rows);
    }catch(err){
        console.error(err);
        res.status(500).json({error:err.message});
    }
}
export async function updateProfile(req,res){
    const {id}=req.params;
    const {username,email}=req.body;
    try{
        const result=await db.query('select * from users where id=$1',[id]);
        if(result.rows.length===0){
            throw new Error('user not found');
        }
        const updatedUser=result.rows[0];
        const response=await db.query('select * from users where (email=$1 or username=$2) and id<>$3',[email,username,id]);
        if(response.rows.length>0){
            throw new Error('username or email already taken');
        }
        if(username!==updatedUser.username || email!==updatedUser.email){
            await db.query('update users set username=$1,email=$2 where id=$3',[username,email,id]);
            res.status(200).json({message:'profile updated'})
        }
    }catch(err){
        console.error(err);
        res.status(500).json({error:err.message});
    }
}
export async function AddBook(req,res){
    const {title,description,author,published_year}=req.body;
    const Published_year=parseInt((published_year),10);
    try{
        const result=await db.query('select * from books where LOWER(title)=$1',[title.toLowerCase().trim()]);
        if(result.rows.length>0){
            throw new Error('A book already exist with same title');
        }
        const response=await db.query('insert into books (title,description,author,published_year) values($1,$2,$3,$4) RETURNING *',[title,description,author,Published_year]);
        if(response.rows.length===0){
            throw new Error('Cannot Add the book, please try again');
        }
        res.status(200).json({message:'book added'});
    }catch(err){
        console.error(err);
        res.status(500).json({error:err.message});
    }
    
}