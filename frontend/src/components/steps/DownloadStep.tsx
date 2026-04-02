'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Pagination,
  Divider,
  Stack,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { finalizeDocument, getDownloadUrl, getDocumentInfo, getPageImageUrl } from '@/api/client';

interface DownloadStepProps {
  documentId: string;
}

export default function DownloadStep({ documentId }: DownloadStepProps) {
  const [finalized, setFinalized] = useState(false);
  const [finalDocId, setFinalDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Preview state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  // Fetch document info for preview
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const info = await getDocumentInfo(documentId);
        setTotalPages(info.pageCount);
      } catch (err) {
        console.error('Failed to fetch document info:', err);
      }
    };
    fetchInfo();
  }, [documentId]);

  const handleFinalize = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await finalizeDocument(documentId);
      setFinalDocId(response.documentId);
      setFinalized(true);
    } catch (err: any) {
      setError(err.message || 'Failed to finalize document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const downloadId = finalDocId || documentId;
    window.open(getDownloadUrl(downloadId), '_blank');
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page - 1);
    setPageLoading(true);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  // Use the correct document ID for preview (finalized if available)
  const previewDocId = finalDocId || documentId;

  return (
    <Box>
      {/* Success Header */}
      <Box textAlign="center" sx={{ mb: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
        <Typography variant="h5" gutterBottom>
          Document Signed Successfully!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Preview your signed document below before downloading.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Document Preview */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={600}>
              📄 Document Preview
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 50}>
                <ZoomOutIcon />
              </IconButton>
              <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center' }}>
                {zoom}%
              </Typography>
              <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomInIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Page Navigation */}
        {totalPages > 1 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: 2, 
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'grey.50',
          }}>
            <IconButton 
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))} 
              disabled={currentPage === 0}
              size="small"
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
              size="small"
            >
              <NavigateNextIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              Page {currentPage + 1} of {totalPages}
            </Typography>
          </Box>
        )}

        {/* Page Image Preview */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: '#525659',
            p: 3,
            minHeight: 400,
            maxHeight: '60vh',
            overflow: 'auto',
          }}
        >
          <Box sx={{ position: 'relative' }}>
            {pageLoading && (
              <Box sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}>
                <CircularProgress sx={{ color: 'white' }} />
              </Box>
            )}
            <img
              src={getPageImageUrl(previewDocId, currentPage)}
              alt={`Page ${currentPage + 1}`}
              onLoad={() => setPageLoading(false)}
              style={{
                maxWidth: `${zoom}%`,
                height: 'auto',
                display: 'block',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                opacity: pageLoading ? 0.3 : 1,
                transition: 'opacity 0.2s',
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Paper sx={{ p: 3 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          justifyContent="center" 
          alignItems="center"
        >
          {!finalized ? (
            <>
              <Box textAlign="center">
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleFinalize}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  sx={{ minWidth: 200 }}
                >
                  {loading ? 'Finalizing...' : 'Finalize Document'}
                </Button>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  Flattens all layers, makes non-editable
                </Typography>
              </Box>
              
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                or
              </Typography>
              
              <Box textAlign="center">
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleDownload}
                  startIcon={<DownloadIcon />}
                  sx={{ minWidth: 200 }}
                >
                  Download Now
                </Button>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  Download without finalizing
                </Typography>
              </Box>
            </>
          ) : (
            <Box textAlign="center">
              <Alert severity="success" sx={{ mb: 2 }}>
                Document finalized successfully! All layers have been flattened.
              </Alert>
              <Button
                variant="contained"
                size="large"
                color="success"
                onClick={handleDownload}
                startIcon={<DownloadIcon />}
                sx={{ minWidth: 250 }}
              >
                Download Final PDF
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
