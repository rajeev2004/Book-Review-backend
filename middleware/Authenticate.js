import jwt from 'jsonwebtoken';
function Authenticate(req,res,next){
    try{
        const token=req.header('Authorization')?.split(' ')[1];
        if(!token){
            return res.status(401).json({error:'Access Denied'});
        }
        const decoded=jwt.verify(token,process.env.SECRET_KEY);
        req.user=decoded;
        next();
    }catch(error){
        console.error(error.message);
        return res.status(400).json({error:'Invalid Token'});
    }
}
export default Authenticate;