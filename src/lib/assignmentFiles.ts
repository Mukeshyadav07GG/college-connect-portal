export const MAX_ASSIGNMENT_FILE_BYTES = 50 * 1024 * 1024;

const ASSIGNMENT_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function hasValidFileSignature(bytes: Uint8Array, mime: string) {
  switch (mime) {
    case "application/pdf":
      return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
    case "image/jpeg":
      return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif": {
      const header = new TextDecoder().decode(bytes.slice(0, 6));
      return header === "GIF87a" || header === "GIF89a";
    }
    case "image/webp":
      return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    case "application/msword":
    case "application/vnd.ms-powerpoint":
    case "application/vnd.ms-excel":
      return hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]);
    default:
      return false;
  }
}

export async function validateAssignmentFile(file: File): Promise<string | null> {
  if (file.size > MAX_ASSIGNMENT_FILE_BYTES) return "Assignment file must be 50 MB or smaller";

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = ASSIGNMENT_FILE_TYPES[extension];
  if (!expectedMime || (file.type && file.type.toLowerCase() !== expectedMime)) {
    return "Use a PDF, Office document, or image file with a matching file extension";
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!hasValidFileSignature(bytes, expectedMime)) {
    return "The file contents do not match the selected file type";
  }
  return null;
}