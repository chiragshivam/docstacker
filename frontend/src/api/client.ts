import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SignatureField {
  id: string;
  fieldType: string;
  pageNumber: number;
  xNorm: number;
  yNorm: number;
  widthNorm: number;
  heightNorm: number;
  signerRole: string;
  required: boolean;
  anchorLogic?: string;
}

export interface StackResponse {
  documentId: string;
  pageCount: number;
  message: string;
}

export interface DocumentInfo {
  documentId: string;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
}

// Stack documents (upload PDFs and merge them)
export const stackDocuments = async (
  letterhead: File | null,
  cover: File,
  body: File,
  terms: File | null,
  stamp: File | null
): Promise<StackResponse> => {
  const formData = new FormData();
  if (letterhead) formData.append('letterhead', letterhead);
  formData.append('cover', cover);
  formData.append('body', body);
  if (terms) formData.append('terms', terms);
  if (stamp) formData.append('stamp', stamp);

  const response = await apiClient.post('/api/stack', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Get document preview URL
export const getPreviewUrl = (documentId: string): string => {
  return `${API_BASE_URL}/api/documents/${documentId}/preview`;
};

// Get page image URL
export const getPageImageUrl = (documentId: string, pageNumber: number): string => {
  return `${API_BASE_URL}/api/documents/${documentId}/pages/${pageNumber}/image`;
};

// Get document info
export const getDocumentInfo = async (documentId: string): Promise<DocumentInfo> => {
  const response = await apiClient.get(`/api/documents/${documentId}/info`);
  return response.data;
};

// Save signature fields
export const saveFields = async (
  documentId: string,
  fields: SignatureField[]
): Promise<void> => {
  // Debug: Log the exact payload being sent
  const payload = { fields };
  console.log('API saveFields payload:', JSON.stringify(payload, null, 2));
  
  await apiClient.post(`/api/documents/${documentId}/fields`, payload);
};

// Get signature fields
export const getFields = async (documentId: string): Promise<SignatureField[]> => {
  const response = await apiClient.get(`/api/documents/${documentId}/fields`);
  return response.data;
};

// Sign document
export const signDocument = async (
  documentId: string,
  signatures: Record<string, { imageBase64: string; fieldId: string }>
): Promise<{ documentId: string }> => {
  const response = await apiClient.post(`/api/documents/${documentId}/sign`, {
    signatures,
  });
  return response.data;
};

// Finalize document
export const finalizeDocument = async (
  documentId: string
): Promise<{ documentId: string }> => {
  const response = await apiClient.post(`/api/documents/${documentId}/finalize`);
  return response.data;
};

// Get download URL
export const getDownloadUrl = (documentId: string): string => {
  return `${API_BASE_URL}/api/documents/${documentId}/download`;
};

export default apiClient;
