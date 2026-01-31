'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Pagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import DrawIcon from '@mui/icons-material/Draw';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteIcon from '@mui/icons-material/Delete';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { SignatureField, saveFields, getDocumentInfo, getPageImageUrl } from '@/api/client';
import type { Signer } from '@/app/page';

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface PlaceFieldsStepProps {
  documentId: string;
  onFieldsPlaced: () => void;
  onBack: () => void;
  signers: Signer[];
  autoTest?: boolean; // Enable auto-placement for E2E testing
}

export default function PlaceFieldsStep({ documentId, onFieldsPlaced, onBack, signers, autoTest }: PlaceFieldsStepProps) {
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Signer selection for adding new fields
  const [selectedSignerId, setSelectedSignerId] = useState<string>(signers[0]?.id || '');
  const [signerMenuAnchor, setSignerMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Page navigation
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);
  
  // Container ref for coordinate calculation
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Auto-test state
  const [autoPlacing, setAutoPlacing] = useState(false);

  // Auto-place fields for all signers (E2E test mode)
  const autoPlaceFields = async () => {
    setAutoPlacing(true);
    
    const newFields: SignatureField[] = [];
    
    // Place one signature field for each signer on different pages (or same page with offset)
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const targetPage = Math.min(i, totalPages - 1); // Distribute across pages
      
      // Random position in lower half, avoiding overlap
      const xBase = 0.15 + (i % 3) * 0.25; // Spread horizontally
      const yBase = 0.55 + (Math.floor(i / 3) * 0.15); // Lower half
      const xNorm = xBase + Math.random() * 0.1;
      const yNorm = yBase + Math.random() * 0.1;
      
      const field: SignatureField = {
        id: generateUUID(),
        fieldType: 'signature',
        pageNumber: targetPage,
        xNorm: Math.min(xNorm, 0.7), // Keep within bounds
        yNorm: Math.min(yNorm, 0.85),
        widthNorm: 0.2,
        heightNorm: 0.06,
        signerRole: signer.id,
        required: true,
      };
      
      newFields.push(field);
      
      // Visual delay for demonstration
      await new Promise(r => setTimeout(r, 300));
      setFields(prev => [...prev, field]);
    }
    
    setAutoPlacing(false);
  };

  // Fetch document info
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const info = await getDocumentInfo(documentId);
        setTotalPages(info.pageCount);
      } catch (err) {
        console.error('Failed to fetch document info:', err);
        setError('Failed to load document information');
      }
    };
    fetchInfo();
  }, [documentId]);

  // Handle image load to get actual dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.clientWidth, height: img.clientHeight });
    setPageLoading(false);
  };

  const getSignerById = (id: string): Signer | undefined => {
    return signers.find(s => s.id === id);
  };

  const getSelectedSigner = (): Signer | undefined => {
    return getSignerById(selectedSignerId);
  };

  const addField = (fieldType: string) => {
    const signer = getSelectedSigner();
    if (!signer) {
      setError('Please select a signer first');
      return;
    }

    const newField: SignatureField = {
      id: generateUUID(),
      fieldType,
      pageNumber: currentPage,
      xNorm: 0.3,
      yNorm: 0.7,
      widthNorm: 0.25,
      heightNorm: 0.08,
      signerRole: signer.id,
      required: true,
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFieldId(fieldId);
    setDragging(fieldId);
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !imageContainerRef.current || imageSize.width === 0) return;
      
      const containerRect = imageContainerRef.current.getBoundingClientRect();
      
      // Calculate new normalized position relative to the image
      const rawX = (e.clientX - containerRect.left - dragOffset.x) / imageSize.width;
      const rawY = (e.clientY - containerRect.top - dragOffset.y) / imageSize.height;
      
      setFields(prevFields => 
        prevFields.map(f => {
          if (f.id !== dragging) return f;
          
          // Clamp values to keep field within image bounds
          const clampedX = Math.max(0, Math.min(1 - f.widthNorm, rawX));
          const clampedY = Math.max(0, Math.min(1 - f.heightNorm, rawY));
          
          return { ...f, xNorm: clampedX, yNorm: clampedY };
        })
      );
    },
    [dragging, dragOffset, imageSize]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const deleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleSave = async () => {
    // Validate that all signers have at least one field
    const signerWithFields = new Set(fields.map(f => f.signerRole));
    const signersWithoutFields = signers.filter(s => !signerWithFields.has(s.id));
    
    if (signersWithoutFields.length > 0) {
      const names = signersWithoutFields.map(s => s.name).join(', ');
      setError(`Please add at least one signature field for: ${names}`);
      return;
    }

    setLoading(true);
    try {
      // Log coordinates for debugging
      console.log('Saving fields:', JSON.stringify(fields, null, 2));
      fields.forEach(f => {
        const signer = getSignerById(f.signerRole);
        console.log(`Field ${f.id} for ${signer?.name} on page ${f.pageNumber}: x=${f.xNorm.toFixed(4)}, y=${f.yNorm.toFixed(4)}`);
      });
      
      await saveFields(documentId, fields);
      onFieldsPlaced();
    } catch (err) {
      console.error('Failed to save fields:', err);
      setError('Failed to save field placements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page - 1);
    setPageLoading(true);
    setSelectedFieldId(null);
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'signature': return <DrawIcon fontSize="small" />;
      case 'text': return <TextFieldsIcon fontSize="small" />;
      case 'date': return <CalendarTodayIcon fontSize="small" />;
      default: return <DrawIcon fontSize="small" />;
    }
  };

  // Filter fields for current page
  const currentPageFields = fields.filter(f => f.pageNumber === currentPage);
  const totalFieldCount = fields.length;

  // Calculate field counts per signer
  const fieldCountsBySigner = signers.map(signer => ({
    signer,
    count: fields.filter(f => f.signerRole === signer.id).length,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Place Signature Fields
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a signer, navigate to a page, and add signature fields for each signer.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Signer Selection */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Adding fields for:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {signers.map((signer, index) => {
            const isSelected = selectedSignerId === signer.id;
            const fieldCount = fields.filter(f => f.signerRole === signer.id).length;
            
            return (
              <Chip
                key={signer.id}
                icon={<PersonIcon />}
                label={`${signer.name} (${fieldCount})`}
                onClick={() => setSelectedSignerId(signer.id)}
                variant={isSelected ? 'filled' : 'outlined'}
                sx={{
                  backgroundColor: isSelected ? signer.color : 'transparent',
                  borderColor: signer.color,
                  color: isSelected ? 'white' : signer.color,
                  fontWeight: isSelected ? 700 : 400,
                  '& .MuiChip-icon': {
                    color: isSelected ? 'white' : signer.color,
                  },
                  '&:hover': {
                    backgroundColor: isSelected ? signer.color : `${signer.color}20`,
                  },
                }}
              />
            );
          })}
        </Stack>
      </Paper>

      {/* Field toolbar */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
        <Tooltip title={`Add Signature Field for ${getSelectedSigner()?.name || 'selected signer'}`}>
          <Button
            variant="contained"
            startIcon={<DrawIcon />}
            onClick={() => addField('signature')}
            sx={{
              backgroundColor: getSelectedSigner()?.color || '#1976d2',
              '&:hover': {
                backgroundColor: getSelectedSigner()?.color || '#1565c0',
                filter: 'brightness(0.9)',
              },
            }}
          >
            Add Signature for {getSelectedSigner()?.name || 'Signer'}
          </Button>
        </Tooltip>
        <Tooltip title="Add Date Field">
          <Button
            variant="outlined"
            startIcon={<CalendarTodayIcon />}
            onClick={() => addField('date')}
            sx={{
              borderColor: getSelectedSigner()?.color,
              color: getSelectedSigner()?.color,
            }}
          >
            Add Date
          </Button>
        </Tooltip>
        
        <Tooltip title="Auto-place signature fields for all signers (E2E Testing)">
          <Button
            variant="outlined"
            color="secondary"
            onClick={autoPlaceFields}
            disabled={autoPlacing || fields.length > 0}
            size="small"
          >
            {autoPlacing ? '⏳ Auto-Placing...' : '🤖 Auto-Place All'}
          </Button>
        </Tooltip>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Typography variant="body2" color="text.secondary">
          Page {currentPage + 1} of {totalPages} • {currentPageFields.length} field(s) on this page
        </Typography>
      </Stack>

      {/* Page Navigation */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))} 
            disabled={currentPage === 0}
          >
            <NavigateBeforeIcon />
          </IconButton>
          <Pagination
            count={totalPages}
            page={currentPage + 1}
            onChange={handlePageChange}
            color="primary"
            size="small"
            hidePrevButton
            hideNextButton
          />
          <IconButton 
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} 
            disabled={currentPage === totalPages - 1}
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>
      )}

      {/* PDF Page as Image with Field Overlay */}
      <Paper
        sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          backgroundColor: '#525659',
          p: 2,
          minHeight: 400,
        }}
        onClick={() => setSelectedFieldId(null)}
      >
        {/* Image container - this is the coordinate reference */}
        <Box
          ref={imageContainerRef}
          sx={{
            position: 'relative',
            display: 'inline-block',
            lineHeight: 0,
          }}
        >
          {/* Page Image */}
          {pageLoading && (
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}>
              <CircularProgress />
            </Box>
          )}
          <img
            src={getPageImageUrl(documentId, currentPage)}
            alt={`Page ${currentPage + 1}`}
            onLoad={handleImageLoad}
            style={{
              maxWidth: '100%',
              maxHeight: '65vh',
              display: 'block',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              opacity: pageLoading ? 0.3 : 1,
              transition: 'opacity 0.2s',
            }}
          />

          {/* Field Overlay - positioned relative to image */}
          {!pageLoading && imageSize.width > 0 && currentPageFields.map((field) => {
            const isSelected = selectedFieldId === field.id;
            const isDragging = dragging === field.id;
            const signer = getSignerById(field.signerRole);
            const signerColor = signer?.color || '#1976d2';
            
            // Calculate pixel positions from normalized coordinates
            const left = field.xNorm * imageSize.width;
            const top = field.yNorm * imageSize.height;
            const width = field.widthNorm * imageSize.width;
            const height = field.heightNorm * imageSize.height;
            
            return (
              <Box
                key={field.id}
                onMouseDown={(e) => handleMouseDown(e, field.id)}
                sx={{
                  position: 'absolute',
                  left: left,
                  top: top,
                  width: Math.max(width, 100),
                  height: Math.max(height, 45),
                  border: isSelected ? `3px solid ${signerColor}` : `2px dashed ${signerColor}`,
                  backgroundColor: isSelected ? `${signerColor}66` : `${signerColor}40`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0,
                  borderRadius: 1,
                  userSelect: 'none',
                  zIndex: isSelected ? 1000 : 100,
                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.3)',
                  '&:hover': {
                    backgroundColor: `${signerColor}70`,
                  },
                }}
              >
                {/* Signer name label */}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 700, 
                    color: 'white',
                    backgroundColor: signerColor,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.5,
                    fontSize: '0.65rem',
                    lineHeight: 1,
                    position: 'absolute',
                    top: -10,
                    left: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {signer?.name || 'Unknown'}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  {getFieldIcon(field.fieldType)}
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600, 
                      color: 'white',
                      textShadow: `0 1px 3px ${signerColor}`,
                    }}
                  >
                    {field.fieldType === 'signature' ? 'Sign Here' : field.fieldType}
                  </Typography>
                </Box>
                
                {isSelected && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteField(field.id);
                    }}
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: -12,
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      width: 24,
                      height: 24,
                      '&:hover': { backgroundColor: '#b71c1c' },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>
            );
          })}

          {/* Instructions overlay when no fields on current page */}
          {!pageLoading && currentPageFields.length === 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.75)',
                color: 'white',
                px: 4,
                py: 2,
                borderRadius: 2,
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="body1" gutterBottom>
                No fields on this page
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Select a signer and click "Add Signature" to place a field here
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Field summary */}
      <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Field Summary:
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {fieldCountsBySigner.map(({ signer, count }) => (
            <Chip
              key={signer.id}
              icon={<DrawIcon />}
              label={`${signer.name}: ${count} field(s)`}
              variant="outlined"
              size="small"
              sx={{
                borderColor: signer.color,
                color: signer.color,
                '& .MuiChip-icon': { color: signer.color },
              }}
            />
          ))}
          <Chip
            label={`Total: ${totalFieldCount} field(s)`}
            variant="filled"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Paper>

      {/* Navigation buttons */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack} variant="outlined">
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || totalFieldCount === 0}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          size="large"
        >
          {loading ? 'Saving...' : `Continue to Sign (${totalFieldCount} fields)`}
        </Button>
      </Box>
    </Box>
  );
}
