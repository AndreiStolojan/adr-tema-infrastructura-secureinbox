import { Router } from 'express';

import {
  getEmail,
  getEmailRaw,
  getEmails,
  getSummary,
} from '../controllers/email.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authorize);
router.get('/summary', getSummary);
router.get('/', getEmails);
router.get('/:emailId/raw', getEmailRaw);
router.get('/:emailId', getEmail);

export default router;
