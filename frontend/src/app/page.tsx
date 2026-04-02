'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import UploadStep from '@/components/steps/UploadStep';
import PlaceFieldsStep from '@/components/steps/PlaceFieldsStep';
import SignStep from '@/components/steps/SignStep';
import DownloadStep from '@/components/steps/DownloadStep';

const steps = ['Upload Documents', 'Place Signature Fields', 'Sign', 'Download'];

// Signer type with unique ID, name, and color for visual distinction
export interface Signer {
  id: string;
  name: string;
  email?: string;
  color: string;
}

// Predefined colors for signers
const SIGNER_COLORS = [
  '#1976d2', // Blue
  '#9c27b0', // Purple
  '#2e7d32', // Green
  '#ed6c02', // Orange
  '#d32f2f', // Red
];

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [signedDocumentId, setSignedDocumentId] = useState<string | null>(null);
  const [signers, setSigners] = useState<Signer[]>([
    { id: 'signer_1', name: 'Signer 1', color: SIGNER_COLORS[0] }
  ]);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleDocumentUploaded = (docId: string) => {
    setDocumentId(docId);
    handleNext();
  };

  const handleFieldsPlaced = () => {
    handleNext();
  };

  const handleSigned = (signedDocId: string) => {
    setSignedDocumentId(signedDocId);
    handleNext();
  };

  const handleSignersChange = (newSigners: Signer[]) => {
    setSigners(newSigners);
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <UploadStep 
            onUploaded={handleDocumentUploaded}
            signers={signers}
            onSignersChange={handleSignersChange}
            signerColors={SIGNER_COLORS}
          />
        );
      case 1:
        return (
          <PlaceFieldsStep
            documentId={documentId!}
            onFieldsPlaced={handleFieldsPlaced}
            onBack={handleBack}
            signers={signers}
          />
        );
      case 2:
        return (
          <SignStep
            documentId={documentId!}
            onSigned={handleSigned}
            onBack={handleBack}
            signers={signers}
          />
        );
      case 3:
        return (
          <DownloadStep
            documentId={signedDocumentId || documentId!}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        DocStacker
      </Typography>
      <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary">
        Stack PDFs, Place Signature Fields, Sign Documents
      </Typography>

      <Paper sx={{ p: 3, mt: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400 }}>
          {renderStep()}
        </Box>
      </Paper>
    </Container>
  );
}
