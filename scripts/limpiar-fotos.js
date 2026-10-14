// scripts/limpiar-fotos.js
//
// Detecta fotos "huérfanas" en Azure Blob Storage: archivos que están
// en el contenedor pero que ya no son la foto_url de ningún producto
// (por ejemplo, después de usar "Quitar foto" en el panel de admin, o
// de borrar un producto de prueba).
//
// POR DEFECTO ES UNA SIMULACIÓN: solo lista lo que se borraría, sin
// borrar nada. Para borrar de verdad hay que agregar --borrar.
//
// USO (desde la raíz del proyecto):
//   node scripts/limpiar-fotos.js            ← solo muestra, no borra
//   node scripts/limpiar-fotos.js --borrar   ← borra las huérfanas
//
// Requiere en tu .env local las mismas variables que usa Azure:
//   AZURE_STORAGE_CONNECTION_STRING
//   AZURE_STORAGE_CONTAINER   (debe ser el nombre real: fotos-productos)

import dotenv from "dotenv";
dotenv.config();

import { BlobServiceClient } from "@azure/storage-blob";
import "../api/v1/config/db.js";
import { Globo } from "../api/v1/models/index.js";

const borrar = process.argv.includes("--borrar");

async function limpiarFotos() {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER;

    if (!connectionString || !containerName) {
      console.error("✗ Faltan AZURE_STORAGE_CONNECTION_STRING o AZURE_STORAGE_CONTAINER en tu .env");
      process.exit(1);
    }

    const containerClient = BlobServiceClient
      .fromConnectionString(connectionString)
      .getContainerClient(containerName);

    // 1. Nombres de archivo que SÍ están en uso: la última parte de
    //    cada foto_url guardada en la base de datos.
    const globos = await Globo.findAll({ attributes: ["foto_url"] });
    const enUso = new Set(
      globos
        .filter((g) => g.foto_url)
        .map((g) => new URL(g.foto_url).pathname.split("/").pop())
    );

    // 2. Recorrer todo lo que hay en el contenedor y separar huérfanos.
    const huerfanos = [];
    let totalBlobs = 0;
    for await (const blob of containerClient.listBlobsFlat()) {
      totalBlobs++;
      if (!enUso.has(blob.name)) {
        huerfanos.push({ nombre: blob.name, kb: Math.round((blob.properties.contentLength || 0) / 1024) });
      }
    }

    console.log(`Fotos en el contenedor: ${totalBlobs}`);
    console.log(`Fotos en uso por productos: ${enUso.size}`);
    console.log(`Fotos huérfanas: ${huerfanos.length}`);

    if (huerfanos.length === 0) {
      console.log("✅ No hay nada que limpiar.");
      return;
    }

    huerfanos.forEach((h) => console.log(`  - ${h.nombre} (${h.kb} KB)`));

    if (!borrar) {
      console.log("\n(Simulación: no se borró nada. Corre con --borrar para eliminarlas.)");
      return;
    }

    for (const h of huerfanos) {
      await containerClient.deleteBlob(h.nombre);
      console.log(`🗑️  Borrada: ${h.nombre}`);
    }
    console.log(`\n✅ ${huerfanos.length} foto(s) huérfana(s) eliminada(s).`);
  } catch (err) {
    console.error("✗ Error:", err.message);
  } finally {
    process.exit(0);
  }
}

limpiarFotos();
