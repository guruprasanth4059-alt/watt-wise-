import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  simulateProjectProposal
} from '../services/projects.js';

export const projectsRouter = Router();
projectsRouter.use(authenticateToken);

// GET /api/projects - List energy projects
projectsRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const projects = getProjects(societyId);
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch projects.' });
  }
});

// GET /api/projects/:id - Get project details
projectsRouter.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const project = getProjectById(req.params.id, societyId);
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch project.' });
  }
});

// POST /api/projects - Register new project
projectsRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const project = createProject({
      societyId,
      createdBy: req.user?.id,
      ...req.body
    });
    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create project.' });
  }
});

// PUT /api/projects/:id - Update project
projectsRouter.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const updated = updateProject(req.params.id, societyId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id - Remove project
projectsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    deleteProject(req.params.id, societyId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete project.' });
  }
});

// POST /api/projects/simulate - Quick financial simulation for project proposal
projectsRouter.post('/simulate', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const sim = simulateProjectProposal(societyId, req.body.category, req.body);
    res.json(sim);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate project.' });
  }
});
