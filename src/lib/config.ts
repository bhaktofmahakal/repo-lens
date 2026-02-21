/* utsav */
export const config = {
  maxZipSizeMb: parseInt(process.env.MAX_ZIP_SIZE_MB || '25', 10),
  maxTotalFiles: parseInt(process.env.MAX_TOTAL_FILES || '1000', 10),
  maxTotalChars: parseInt(process.env.MAX_TOTAL_CHARS || '4000000', 10),
  maxFileChars: parseInt(process.env.MAX_FILE_CHARS || '200000', 10),
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
};
