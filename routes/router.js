import express from "express"
const router=express.Router();
import Authenticate from "../middleware/Authenticate.js";
import {register,login, getBooks, getParticularBook, getReviews, postReview, Search, getProfile, updateProfile, AddBook} from '../controller/userController.js';
router.post('/register',register);
router.post('/login',login);
router.get('/books',getBooks);
router.get('/books/:id',getParticularBook);
router.get('/reviews/:id',getReviews);
router.post('/reviews',postReview);
router.get('/search/:term/:rating',Search);
router.get('/users/:id',getProfile);
router.put('/users/:id',Authenticate,updateProfile);
router.post('/books',AddBook);
export default router;