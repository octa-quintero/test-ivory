import { Router } from 'express';
import { authLimiter } from '../middlewares/rateLimiter';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/login', authLimiter, authController.login);

export default router;
