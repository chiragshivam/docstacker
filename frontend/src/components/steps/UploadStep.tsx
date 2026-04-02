'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  IconButton,
  Chip,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import StampIcon from '@mui/icons-material/Approval';
import ImageIcon from '@mui/icons-material/Image';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { stackDocuments } from '@/api/client';
import type { Signer } from '@/app/page';

// E2E Test Configuration
const TEST_CONFIG = {
  signers: [
    { name: 'Chirag Chopra' },
    { name: 'Preeti V' },
    { name: 'Manu Jindal' },
  ],
  files: {
    letterhead: '/test-files/letterhead.pdf',
    cover: '/test-files/Cover.pdf',
    body: '/test-files/Body Content.pdf',
    terms: '/test-files/T&C.pdf',
    stamp: '/test-files/sampleStam.png',
  },
};

interface UploadStepProps {
  onUploaded: (documentId: string) => void;
  signers: Signer[];
  onSignersChange: (signers: Signer[]) => void;
  signerColors: string[];
}

interface FileUploadBoxProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
  accept?: string;
  icon?: React.ReactNode;
  description?: string;
}

function FileUploadBox({ 
  label, 
  file, 
  onFileSelect, 
  required = false, 
  accept = '.pdf',
  icon,
  description,
}: FileUploadBoxProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) onFileSelect(droppedFile);
    },
    [onFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onFileSelect(selectedFile);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: file ? 'success.light' : 'grey.50',
        borderStyle: 'dashed',
        '&:hover': { backgroundColor: 'grey.100' },
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        style={{ display: 'none' }}
        id={`file-upload-${label.replace(/\s/g, '-')}`}
      />
      <label htmlFor={`file-upload-${label.replace(/\s/g, '-')}`} style={{ cursor: 'pointer', display: 'block' }}>
        {icon || <CloudUploadIcon sx={{ fontSize: 40, color: file ? 'success.main' : 'grey.500', mb: 1 }} />}
        <Typography variant="subtitle1" gutterBottom>
          {label} {required && '*'}
        </Typography>
        {file ? (
          <Typography variant="body2" color="success.main">
            {file.name}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {description || 'Drag & drop or click to upload'}
          </Typography>
        )}
      </label>
    </Paper>
  );
}

// Generate unique ID for signers
function generateSignerId(): string {
  return 'signer_' + Math.random().toString(36).substr(2, 9);
}

export default function UploadStep({ onUploaded, signers, onSignersChange, signerColors }: UploadStepProps) {
  const [letterhead, setLetterhead] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [body, setBody] = useState<File | null>(null);
  const [terms, setTerms] = useState<File | null>(null);
  const [stamp, setStamp] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // E2E Test state
  const [testRunning, setTestRunning] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testSteps, setTestSteps] = useState<{ name: string; status: 'pending' | 'running' | 'success' | 'error' }[]>([]);

  // Fetch file from URL and convert to File object
  const fetchFileAsFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'application/pdf' });
  };

  // Run E2E Test
  const runE2ETest = async () => {
    setTestRunning(true);
    setTestDialogOpen(true);
    
    const steps = [
      { name: 'Loading letterhead.pdf...', status: 'pending' as const },
      { name: 'Loading Cover.pdf...', status: 'pending' as const },
      { name: 'Loading Body Content.pdf...', status: 'pending' as const },
      { name: 'Loading T&C.pdf...', status: 'pending' as const },
      { name: 'Loading sampleStam.png...', status: 'pending' as const },
      { name: 'Configuring 3 signers...', status: 'pending' as const },
    ];
    setTestSteps(steps);

    const updateStep = (index: number, status: 'running' | 'success' | 'error') => {
      setTestSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
    };

    try {
      // Step 1: Letterhead
      updateStep(0, 'running');
      const letterheadFile = await fetchFileAsFile(TEST_CONFIG.files.letterhead, 'letterhead.pdf');
      setLetterhead(letterheadFile);
      await new Promise(r => setTimeout(r, 400));
      updateStep(0, 'success');

      // Step 2: Cover
      updateStep(1, 'running');
      const coverFile = await fetchFileAsFile(TEST_CONFIG.files.cover, 'Cover.pdf');
      setCover(coverFile);
      await new Promise(r => setTimeout(r, 400));
      updateStep(1, 'success');

      // Step 3: Body
      updateStep(2, 'running');
      const bodyFile = await fetchFileAsFile(TEST_CONFIG.files.body, 'Body Content.pdf');
      setBody(bodyFile);
      await new Promise(r => setTimeout(r, 400));
      updateStep(2, 'success');

      // Step 4: Terms
      updateStep(3, 'running');
      const termsFile = await fetchFileAsFile(TEST_CONFIG.files.terms, 'T&C.pdf');
      setTerms(termsFile);
      await new Promise(r => setTimeout(r, 400));
      updateStep(3, 'success');

      // Step 5: Stamp
      updateStep(4, 'running');
      const stampFile = await fetchFileAsFile(TEST_CONFIG.files.stamp, 'sampleStam.png');
      setStamp(stampFile);
      await new Promise(r => setTimeout(r, 400));
      updateStep(4, 'success');

      // Step 6: Configure signers
      updateStep(5, 'running');
      const testSigners = TEST_CONFIG.signers.map((signer, index) => ({
        id: `signer_e2e_${index + 1}`,
        name: signer.name,
        color: signerColors[index] || signerColors[0],
      }));
      onSignersChange(testSigners);
      await new Promise(r => setTimeout(r, 400));
      updateStep(5, 'success');

      setTestRunning(false);
      
    } catch (err: any) {
      setError(`Test failed: ${err.message}`);
      setTestRunning(false);
    }
  };

  const handleStack = async () => {
    if (!cover || !body) {
      setError('Cover and Body are required');
      return;
    }

    if (signers.length === 0 || signers.some(s => !s.name.trim())) {
      setError('Please add at least one signer with a valid name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await stackDocuments(letterhead, cover, body, terms, stamp);
      onUploaded(response.documentId);
    } catch (err: any) {
      setError(err.message || 'Failed to stack documents');
    } finally {
      setLoading(false);
    }
  };

  const addSigner = () => {
    if (signers.length >= 5) {
      setError('Maximum 5 signers allowed');
      return;
    }
    
    const newSigner: Signer = {
      id: generateSignerId(),
      name: '',
      color: signerColors[signers.length] || signerColors[0],
    };
    onSignersChange([...signers, newSigner]);
  };

  const removeSigner = (id: string) => {
    if (signers.length <= 1) {
      setError('At least one signer is required');
      return;
    }
    onSignersChange(signers.filter(s => s.id !== id));
  };

  const updateSignerName = (id: string, name: string) => {
    onSignersChange(signers.map(s => s.id === id ? { ...s, name } : s));
  };

  // Test completion progress
  const testProgress = testSteps.length > 0 
    ? (testSteps.filter(s => s.status === 'success').length / testSteps.length) * 100 
    : 0;

  return (
    <Box>
      {/* E2E Test Dialog */}
      <Dialog open={testDialogOpen} onClose={() => !testRunning && setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          🧪 E2E Test - Loading Test Data
        </DialogTitle>
        <DialogContent>
          {testRunning && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={testProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {testSteps.filter(s => s.status === 'success').length} of {testSteps.length} steps completed
              </Typography>
            </Box>
          )}
          <List dense>
            {testSteps.map((step, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {step.status === 'success' ? (
                    <CheckCircleIcon color="success" />
                  ) : step.status === 'running' ? (
                    <CircularProgress size={20} />
                  ) : (
                    <HourglassEmptyIcon color="disabled" />
                  )}
                </ListItemIcon>
                <ListItemText primary={step.name} />
              </ListItem>
            ))}
          </List>
          {!testRunning && testProgress === 100 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ✅ Test data loaded! Click "Stack Documents" to continue the test.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)} disabled={testRunning}>
            {testRunning ? 'Loading...' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            Upload Your Documents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload the PDF files that will be stacked together. The letterhead will be applied as a background to all pages.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<PlayArrowIcon />}
          onClick={runE2ETest}
          disabled={testRunning}
          sx={{ whiteSpace: 'nowrap' }}
        >
          🧪 Run E2E Test
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FileUploadBox
            label="Letterhead (Background)"
            file={letterhead}
            onFileSelect={setLetterhead}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FileUploadBox
            label="Cover Page"
            file={cover}
            onFileSelect={setCover}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FileUploadBox
            label="Body Content"
            file={body}
            onFileSelect={setBody}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FileUploadBox
            label="Terms & Conditions"
            file={terms}
            onFileSelect={setTerms}
          />
        </Grid>
      </Grid>

      {/* Stamp Upload Section */}
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Company Stamp (Optional)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a PNG image of your company stamp. It will be placed below each signature automatically.
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FileUploadBox
              label="Stamp Image"
              file={stamp}
              onFileSelect={setStamp}
              accept=".png,.jpg,.jpeg"
              icon={
                <StampIcon sx={{ fontSize: 40, color: stamp ? 'success.main' : 'grey.500', mb: 1 }} />
              }
              description="PNG or JPG (transparent background recommended)"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            {stamp && (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                  Stamp Preview:
                </Typography>
                <Box
                  component="img"
                  src={URL.createObjectURL(stamp)}
                  alt="Stamp preview"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 100,
                    objectFit: 'contain',
                  }}
                />
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => setStamp(null)}
                  sx={{ mt: 1 }}
                >
                  Remove
                </Button>
              </Paper>
            )}
            {!stamp && (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa',
                  borderStyle: 'dashed',
                }}
              >
                <ImageIcon sx={{ fontSize: 40, color: 'grey.400', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" align="center">
                  Stamp preview will appear here
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Signer Configuration Section */}
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
              Configure Signers
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add the people who need to sign this document (up to 5)
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={addSigner}
            disabled={signers.length >= 5}
            size="small"
          >
            Add Signer
          </Button>
        </Stack>

        <Stack spacing={2}>
          {signers.map((signer, index) => (
            <Paper
              key={signer.id}
              variant="outlined"
              sx={{
                p: 2,
                borderLeft: 4,
                borderLeftColor: signer.color,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  label={`Signer ${index + 1}`}
                  size="small"
                  sx={{
                    backgroundColor: signer.color,
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter signer's name"
                  value={signer.name}
                  onChange={(e) => updateSignerName(signer.id, e.target.value)}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  onClick={() => removeSigner(signer.id)}
                  disabled={signers.length <= 1}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>

        {signers.length < 5 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            You can add up to {5 - signers.length} more signer(s)
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleStack}
          disabled={loading || !cover || !body || signers.some(s => !s.name.trim())}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Stacking...' : 'Stack Documents'}
        </Button>
      </Box>
    </Box>
  );
}
