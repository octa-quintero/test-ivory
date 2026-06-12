import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import * as postController from '../controllers/postController';
import * as likeController from '../controllers/likeController';
import * as commentController from '../controllers/commentController';

const router = Router();

router.post('/', authenticate, postController.createPost);
router.get('/:postId', postController.getPost);
router.patch('/:postId', authenticate, postController.updateMyPost);
router.delete('/:postId', authenticate, postController.deleteMyPost);

router.post('/:postId/like', authenticate, likeController.addLike);
router.delete('/:postId/like', authenticate, likeController.removeLike);
router.get('/:postId/comments', commentController.getComments);
router.post('/:postId/comments', authenticate, commentController.createComment);
router.patch('/:postId/comments/:commentId', authenticate, commentController.updateComment);
router.delete('/:postId/comments/:commentId', authenticate, commentController.deleteComment);

export default router;
