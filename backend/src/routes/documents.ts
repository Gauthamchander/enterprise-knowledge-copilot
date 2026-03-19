/**
 * Documents Routes — all endpoints require superadmin role.
 * 
 * Protected by:
 * - authenticate middleware (verifies JWT token)
 * - authorize(['superadmin']) middleware (checks role)
 */
import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { upload } from '../middlewares/upload';
import documentsController from '../controllers/documentsController';

const router = Router();

// All document routes require authentication + superadmin role
router.get(
  '/',
  authenticate,
  authorize(['superadmin']),
  documentsController.getAllDocuments.bind(documentsController)
);

router.post(
  '/',
  authenticate,
  authorize(['superadmin']),
  upload.single('file'), // Handle file upload
  documentsController.createDocument.bind(documentsController)
);

router.delete(
  '/:id',
  authenticate,
  authorize(['superadmin']),
  documentsController.deleteDocument.bind(documentsController)
);

export default router;
