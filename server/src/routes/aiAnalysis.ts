import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { FarmerProfile } from '../models/FarmerProfile';

const router = Router();

/**
 * POST /api/v1/ai/analyze-coffee
 * Upload coffee bean photo and get AI analysis
 */
router.post('/analyze-coffee', authenticateJWT, upload.single('photo'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No photo uploaded' });
      return;
    }

    const photoPath = req.file.path;
    const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Call Python AI grader
    const graderPath = path.join(__dirname, '../../../buna-fair-price/grader/grader.py');
    const graderDir = path.dirname(graderPath);
    const venvPython = path.join(
      graderDir,
      'venv',
      process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
    );
    const pythonExecutable = process.env.PYTHON_PATH || (fs.existsSync(venvPython) ? venvPython : 'python3');

    const result = await runPythonGrader(pythonExecutable, graderPath, photoPath);
    const farmerProfile = await FarmerProfile.findOne({ user: req.user!._id }).select('region zone woreda kebele');
    const location = {
      region: farmerProfile?.region || 'Oromia',
      zone: farmerProfile?.zone || 'Jimma',
      woreda: String(req.body.woreda || farmerProfile?.woreda || '').trim(),
      kebele: String(req.body.kebele || farmerProfile?.kebele || '').trim(),
    };

    // Clean up uploaded file after analysis (optional - keep for reference)
    // fs.unlinkSync(photoPath);

    res.json({
      success: true,
      message: 'AI analysis complete',
      photoUrl,
      analysis: { ...result, location },
      location,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ai/analyze-coffee-url
 * Analyze coffee bean photo from URL (for Telegram bot integration)
 */
router.post('/analyze-coffee-url', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      res.status(400).json({ success: false, message: 'Image URL is required' });
      return;
    }

    // Call Python AI grader with URL
    const graderPath = path.join(__dirname, '../../../buna-fair-price/grader/grader.py');
    const graderDir = path.dirname(graderPath);
    const venvPython = path.join(
      graderDir,
      'venv',
      process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
    );
    const pythonExecutable = process.env.PYTHON_PATH || (fs.existsSync(venvPython) ? venvPython : 'python3');

    const result = await runPythonGrader(pythonExecutable, graderPath, '', imageUrl);
    const farmerProfile = await FarmerProfile.findOne({ user: req.user!._id }).select('region zone woreda kebele');
    const location = {
      region: farmerProfile?.region || 'Oromia',
      zone: farmerProfile?.zone || 'Jimma',
      woreda: String(req.body.woreda || farmerProfile?.woreda || '').trim(),
      kebele: String(req.body.kebele || farmerProfile?.kebele || '').trim(),
    };

    res.json({
      success: true,
      message: 'AI analysis complete',
      photoUrl: imageUrl,
      analysis: { ...result, location },
      location,
    });
  } catch (err) {
    next(err);
  }
});

function runPythonGrader(pythonExecutable: string, graderPath: string, imagePath: string, imageUrl?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = [graderPath];
    
    if (imageUrl) {
      args.push('--url', imageUrl);
    } else if (imagePath) {
      args.push('--image', imagePath);
    } else {
      reject(new Error('Either imagePath or imageUrl must be provided'));
      return;
    }

    const pythonProcess = spawn(pythonExecutable, args, {
      cwd: path.dirname(graderPath),
      env: { ...process.env, PYTHONPATH: path.dirname(graderPath) },
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0 && code !== 2) { // 2 is fallback exit code
        console.error('Python grader stderr:', stderr);
        reject(new Error(`Python grader exited with code ${code}: ${stderr}`));
        return;
      }

      // Try to parse the JSON output file
      const resultPath = path.join(path.dirname(graderPath), 'grade_result.json');
      if (fs.existsSync(resultPath)) {
        try {
          const resultJson = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
          resolve(resultJson);
        } catch (e) {
          // Fallback: try to parse stdout
          try {
            const resultJson = JSON.parse(stdout);
            resolve(resultJson);
          } catch {
            reject(new Error('Failed to parse grader output'));
          }
        }
      } else {
        // Try to parse stdout as last resort
        try {
          const resultJson = JSON.parse(stdout);
          resolve(resultJson);
        } catch {
          reject(new Error('No grader output found'));
        }
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('AI analysis timeout'));
    }, 60000);
  });
}

export default router;
