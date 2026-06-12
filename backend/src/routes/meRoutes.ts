import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import * as userController from '../controllers/userController';

const router = Router();

router.use(authenticate);

router.get('/', userController.getMe);
router.patch('/', userController.updateMe);
router.delete('/', userController.deleteMe);

export default router;
