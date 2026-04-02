'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import { signDocument, getFields, SignatureField } from '@/api/client';
import type { Signer } from '@/app/page';

// Calligraphic fonts for typed signatures
const SIGNATURE_FONTS = [
  { name: 'Dancing Script', style: 'cursive' },
  { name: 'Great Vibes', style: 'cursive' },
  { name: 'Pacifico', style: 'cursive' },
  { name: 'Satisfy', style: 'cursive' },
  { name: 'Allura', style: 'cursive' },
];

interface SignStepProps {
  documentId: string;
  onSigned: (signedDocumentId: string) => void;
  onBack: () => void;
  signers: Signer[];
}

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
  signerColor?: string;
}

function SignatureCanvas({ onSignatureChange, signerColor = '#1976d2' }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set up canvas
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    
    if (hasSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        onSignatureChange(canvas.toDataURL('image/png'));
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{ p: 1, backgroundColor: '#fff', borderColor: signerColor }}
      >
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          style={{
            display: 'block',
            touchAction: 'none',
            cursor: 'crosshair',
            backgroundColor: '#fafafa',
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </Paper>
      <Box sx={{ mt: 1, textAlign: 'right' }}>
        <Button size="small" onClick={clearSignature}>
          Clear
        </Button>
      </Box>
    </Box>
  );
}

interface TypedSignatureProps {
  onSignatureChange: (dataUrl: string | null) => void;
  initialName?: string;
}

function TypedSignature({ onSignatureChange, initialName = '' }: TypedSignatureProps) {
  const [name, setName] = useState(initialName);
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].name);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Store callback ref to avoid dependency issues
  const onSignatureChangeRef = useRef(onSignatureChange);
  onSignatureChangeRef.current = onSignatureChange;

  // Load Google Fonts
  useEffect(() => {
    const fontFamilies = SIGNATURE_FONTS.map(f => f.name.replace(/ /g, '+')).join('&family=');
    const existingLink = document.querySelector(`link[href*="fonts.googleapis.com/css2?family=${fontFamilies.split('&')[0]}"]`);
    
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      
      link.onload = () => {
        setTimeout(() => setFontsLoaded(true), 500);
      };
    } else {
      setFontsLoaded(true);
    }
  }, []);

  // Render typed signature to canvas when name, font, or fonts loaded changes
  useEffect(() => {
    if (!fontsLoaded) return;
    
    if (!name.trim() || !canvasRef.current) {
      onSignatureChangeRef.current(null);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set font
    const fontSize = 48;
    ctx.font = `${fontSize}px "${selectedFont}", cursive`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';

    // Measure text
    const metrics = ctx.measureText(name);
    const textWidth = metrics.width;

    // Scale if text is too wide
    let scale = 1;
    const maxWidth = canvas.width - 40;
    if (textWidth > maxWidth) {
      scale = maxWidth / textWidth;
    }

    // Draw centered text
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.fillText(name, -textWidth / 2, 0);
    ctx.restore();

    // Export as PNG
    onSignatureChangeRef.current(canvas.toDataURL('image/png'));
  }, [name, selectedFont, fontsLoaded]);

  const handleFontChange = (_: React.MouseEvent<HTMLElement>, newFont: string | null) => {
    if (newFont) {
      setSelectedFont(newFont);
    }
  };

  return (
    <Box>
      <TextField
        fullWidth
        label="Type your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        sx={{ mb: 2 }}
        autoFocus
      />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Choose a style:
      </Typography>
      
      <ToggleButtonGroup
        value={selectedFont}
        exclusive
        onChange={handleFontChange}
        sx={{ 
          mb: 2, 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiToggleButton-root': {
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            px: 2,
            py: 1,
          },
        }}
      >
        {SIGNATURE_FONTS.map((font) => (
          <ToggleButton 
            key={font.name} 
            value={font.name}
            sx={{
              fontFamily: `"${font.name}", cursive`,
              fontSize: '1.2rem',
              textTransform: 'none',
            }}
          >
            {name || 'Preview'}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Hidden canvas for rendering */}
      <canvas
        ref={canvasRef}
        width={500}
        height={150}
        style={{ display: 'none' }}
      />

      {/* Preview */}
      {name && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            backgroundColor: '#fafafa',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 100,
          }}
        >
          <Typography
            sx={{
              fontFamily: `"${selectedFont}", cursive`,
              fontSize: '3rem',
              color: '#000',
              userSelect: 'none',
            }}
          >
            {name}
          </Typography>
        </Paper>
      )}

      {!name && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            backgroundColor: '#fafafa',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 100,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Start typing to see your signature preview
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

// Individual signer signing component
interface SignerSigningPanelProps {
  signer: Signer;
  fieldCount: number;
  signature: string | null;
  onSignatureChange: (signature: string | null) => void;
  isActive: boolean;
}

function SignerSigningPanel({ signer, fieldCount, signature, onSignatureChange, isActive }: SignerSigningPanelProps) {
  const [tabValue, setTabValue] = useState(0);
  // Start in editing mode only if no signature exists yet
  const [isEditing, setIsEditing] = useState(!signature);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    onSignatureChange(null);
  };

  const handleReSign = () => {
    setIsEditing(true);
    setTabValue(0);
    onSignatureChange(null);
  };

  if (!isActive) return null;

  // Show completed state only when we have a signature AND not actively editing
  const showCompletedState = !!signature && !isEditing;

  return (
    <Box>
      <Paper sx={{ p: 3, maxWidth: 580, borderLeft: 4, borderLeftColor: signer.color }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip
            icon={<PersonIcon />}
            label={signer.name}
            sx={{
              backgroundColor: signer.color,
              color: 'white',
              fontWeight: 600,
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {fieldCount} signature field(s)
          </Typography>
          {signature && (
            <Chip 
              icon={<CheckCircleIcon />} 
              label="Signed" 
              size="small" 
              color="success"
              sx={{ ml: 'auto' }}
            />
          )}
        </Box>

        {/* Show completed state when returning to a signed signer */}
        {showCompletedState && (
          <>
            <Alert 
              severity="success" 
              sx={{ mb: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleReSign}
                >
                  Re-sign
                </Button>
              }
            >
              Signature captured! You can proceed or re-sign if needed.
            </Alert>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current signature:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fafafa' }}>
                <img
                  src={signature}
                  alt="Signature preview"
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: 100 }}
                />
              </Paper>
            </Box>
          </>
        )}

        {/* Show editing interface */}
        {!showCompletedState && (
          <>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="Draw" />
              <Tab label="Type" />
              <Tab label="Upload" disabled />
            </Tabs>

            {tabValue === 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Draw your signature in the box below
                </Typography>
                <SignatureCanvas 
                  key={`draw-${signer.id}`}
                  onSignatureChange={onSignatureChange} 
                  signerColor={signer.color} 
                />
                {signature && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Preview:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fafafa' }}>
                      <img
                        src={signature}
                        alt="Signature preview"
                        style={{ maxWidth: '100%', height: 'auto', maxHeight: 80 }}
                      />
                    </Paper>
                  </Box>
                )}
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Type your name and choose a calligraphic style
                </Typography>
                <TypedSignature 
                  key={`type-${signer.id}`}
                  onSignatureChange={onSignatureChange} 
                  initialName={signer.name} 
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}

export default function SignStep({ documentId, onSigned, onBack, signers }: SignStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<SignatureField[]>([]);
  
  // Track which signer is currently signing
  const [currentSignerIndex, setCurrentSignerIndex] = useState(0);
  
  // Store signatures for each signer
  const [signerSignatures, setSignerSignatures] = useState<Record<string, string | null>>({});
  
  // Auto-sign state
  const [autoSigning, setAutoSigning] = useState(false);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const fetchedFields = await getFields(documentId);
        setFields(fetchedFields.filter(f => f.fieldType === 'signature'));
      } catch (err) {
        console.error('Failed to fetch fields:', err);
      }
    };
    fetchFields();
  }, [documentId]);

  // Get signers that have fields assigned to them
  const signersWithFields = signers.filter(signer => 
    fields.some(f => f.signerRole === signer.id)
  );

  const currentSigner = signersWithFields[currentSignerIndex];
  const currentSignature = currentSigner ? signerSignatures[currentSigner.id] : null;

  const handleSignatureChange = (signerId: string, signature: string | null) => {
    setSignerSignatures(prev => ({ ...prev, [signerId]: signature }));
  };

  const getFieldCountForSigner = (signerId: string) => {
    return fields.filter(f => f.signerRole === signerId).length;
  };

  const isSignerComplete = (signerId: string) => {
    return !!signerSignatures[signerId];
  };

  const handleNextSigner = () => {
    if (currentSignerIndex < signersWithFields.length - 1) {
      setCurrentSignerIndex(prev => prev + 1);
    }
  };

  const handlePrevSigner = () => {
    if (currentSignerIndex > 0) {
      setCurrentSignerIndex(prev => prev - 1);
    }
  };

  const allSignersComplete = signersWithFields.every(s => isSignerComplete(s.id));

  // Auto-sign all signers with typed signatures (for E2E testing)
  const autoSignAll = async () => {
    setAutoSigning(true);
    
    for (const signer of signersWithFields) {
      // Generate typed signature using canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Clear canvas with transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Use first calligraphic font (Dancing Script)
        const fontName = SIGNATURE_FONTS[0].name;
        ctx.font = `48px "${fontName}", cursive`;
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';
        ctx.fillText(signer.name, 20, canvas.height / 2);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png');
        setSignerSignatures(prev => ({ ...prev, [signer.id]: dataUrl }));
      }
      
      // Visual delay
      await new Promise(r => setTimeout(r, 500));
    }
    
    setAutoSigning(false);
  };

  const handleSign = async () => {
    if (!allSignersComplete) {
      setError('Please provide signatures for all signers');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build signatures map - each field gets its signer's signature
      const signatures: Record<string, { imageBase64: string; fieldId: string }> = {};
      
      fields.forEach((field) => {
        const signerSignature = signerSignatures[field.signerRole];
        if (signerSignature) {
          signatures[field.id] = {
            imageBase64: signerSignature,
            fieldId: field.id,
          };
        }
      });

      const response = await signDocument(documentId, signatures);
      onSigned(response.documentId);
    } catch (err: any) {
      setError(err.message || 'Failed to sign document');
    } finally {
      setLoading(false);
    }
  };

  // No fields assigned
  if (fields.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Sign the Document
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          No signature fields found in the document. Please go back and add signature fields.
        </Alert>
        <Button onClick={onBack}>Back</Button>
      </Box>
    );
  }

  // No signers have fields
  if (signersWithFields.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Sign the Document
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          No signers have been assigned signature fields. Please go back and assign fields to signers.
        </Alert>
        <Button onClick={onBack}>Back</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            Sign the Document
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {signersWithFields.length > 1 
              ? `Each signer needs to provide their signature. Progress: ${signersWithFields.filter(s => isSignerComplete(s.id)).length} of ${signersWithFields.length} complete.`
              : 'Provide your signature below.'
            }
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="secondary"
          onClick={autoSignAll}
          disabled={autoSigning || allSignersComplete}
          size="small"
        >
          {autoSigning ? '⏳ Auto-Signing...' : '🤖 Auto-Sign All'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Signer Progress */}
      {signersWithFields.length > 1 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Signing Progress:
          </Typography>
          <Stepper activeStep={currentSignerIndex} orientation="horizontal">
            {signersWithFields.map((signer, index) => {
              const complete = isSignerComplete(signer.id);
              return (
                <Step 
                  key={signer.id} 
                  completed={complete}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setCurrentSignerIndex(index)}
                >
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: complete ? '#4caf50' : (index === currentSignerIndex ? signer.color : 'grey.300'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        {complete ? <CheckCircleIcon fontSize="small" /> : index + 1}
                      </Box>
                    )}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: index === currentSignerIndex ? 700 : 400,
                        color: index === currentSignerIndex ? signer.color : 'text.primary',
                      }}
                    >
                      {signer.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getFieldCountForSigner(signer.id)} field(s)
                    </Typography>
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>
        </Paper>
      )}

      {/* Current Signer's Signing Panel */}
      {currentSigner && (
        <SignerSigningPanel
          key={currentSigner.id}
          signer={currentSigner}
          fieldCount={getFieldCountForSigner(currentSigner.id)}
          signature={currentSignature}
          onSignatureChange={(sig) => handleSignatureChange(currentSigner.id, sig)}
          isActive={true}
        />
      )}

      {/* Navigation and Actions */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={onBack}>Back to Fields</Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {signersWithFields.length > 1 && (
            <>
              <Button 
                onClick={handlePrevSigner} 
                disabled={currentSignerIndex === 0}
                variant="outlined"
              >
                Previous Signer
              </Button>
              {currentSignerIndex < signersWithFields.length - 1 ? (
                <Button 
                  onClick={handleNextSigner}
                  variant="contained"
                  disabled={!currentSignature}
                >
                  Next Signer
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSign}
                  disabled={loading || !allSignersComplete}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  color="success"
                >
                  {loading ? 'Signing...' : 'Sign Document'}
                </Button>
              )}
            </>
          )}
          
          {signersWithFields.length === 1 && (
            <Button
              variant="contained"
              onClick={handleSign}
              disabled={loading || !currentSignature}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Signing...' : 'Sign Document'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
