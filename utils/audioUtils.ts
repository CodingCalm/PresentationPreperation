// utils/audioUtils.ts
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove the "data:audio/...;base64," part
        const parts = reader.result.split(',');
        if (parts.length > 1) {
          resolve(parts[1]);
        } else {
          // Handle cases where the split might not work as expected (e.g., empty data)
          resolve(''); // Or reject, depending on desired behavior for empty data
        }
      } else {
        reject(new Error("Misslyckades med att läsa blob som base64-sträng."));
      }
    };
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("FileReader stötte på ett fel."));
    };
    reader.readAsDataURL(blob);
  });
};
