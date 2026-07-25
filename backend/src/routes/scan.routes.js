import { Router } from 'express';

import { getLatestScan } from '../controllers/scan.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/emails/:emailId/latest', authorize, getLatestScan);

export default router;
