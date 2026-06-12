import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as userController from '../controllers/userController';
import * as postController from '../controllers/postController';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/users', userController.getUsers);
router.delete('/users/:userId', userController.deleteUser);
router.get('/posts', postController.getAllPosts);
router.patch('/posts/:postId', postController.updatePost);
router.delete('/posts/:postId', postController.deletePost);

export default router;
