// api/v1/config/blobStorage.js
//
// Encapsula toda la lógica de subir archivos a Azure Blob Storage en
// un solo lugar. El resto del código (el controller de globo) solo
// llama a subirImagenBlob() sin saber los detalles de la conexión.

import { BlobServiceClient } from "@azure/storage-blob";
import crypto from "crypto";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER;

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

/**
 * Sube una imagen al contenedor de Blob Storage y regresa su URL pública.
 *
 * @param {Buffer} buffer - el contenido del archivo (multer lo entrega así)
 * @param {string} nombreOriginal - nombre original del archivo (ej. "foto.jpg"),
 *   se usa solo para tomar la extensión
 * @param {string} mimetype - tipo de contenido (ej. "image/jpeg")
 * @returns {Promise<string>} URL pública de la imagen ya subida
 */
export async function subirImagenBlob(buffer, nombreOriginal, mimetype) {
  // Nombre único por archivo (crypto.randomUUID) para que dos fotos
  // nunca se pisen entre sí, sin importar que el usuario suba dos
  // archivos que originalmente se llamaban igual (ej. "foto.jpg").
  const extension = nombreOriginal.includes(".")
    ? nombreOriginal.split(".").pop()
    : "jpg";
  const nombreUnico = `${crypto.randomUUID()}.${extension}`;

  const blockBlobClient = containerClient.getBlockBlobClient(nombreUnico);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimetype }
  });

  // Como el contenedor se creó con acceso público de tipo "Blob",
  // esta URL funciona directo en un <img src="..."> sin necesitar login.
  return blockBlobClient.url;
}
