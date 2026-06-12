import { Router } from 'express';
import * as feedController from '../controllers/feedController';

const router = Router();

router.get('/', feedController.getFeed);

export default router;
