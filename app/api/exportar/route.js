import { Document, Packer, Paragraph, TextRun } from "docx";

export async function POST(req) {
  try {
    const body = await req.json();

    const { pregunta, respuesta, contexto, fuentes } = body;

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "INFORME JURÍDICO",
                  bold: true,
                  size: 32,
                }),
              ],
              spacing: { after: 300 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "Consulta: ", bold: true }),
                new TextRun(pregunta),
              ],
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "Respuesta: ", bold: true }),
              ],
            }),

            new Paragraph(respuesta),

            new Paragraph({
              children: [
                new TextRun({ text: "Contexto Normativo: ", bold: true }),
              ],
              spacing: { before: 200 },
            }),

            new Paragraph(contexto),

            new Paragraph({
              children: [
                new TextRun({ text: "Fuentes: ", bold: true }),
              ],
              spacing: { before: 200 },
            }),

            ...fuentes.flatMap((f, i) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Fuente ${i + 1}: ${f.norma}`,
                    bold: true,
                  }),
                ],
              }),

              new Paragraph(`Artículo: ${f.articulo || "-"}`),
              new Paragraph(`Resumen: ${f.resumen || "-"}`),
              new Paragraph(" "),
            ]),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=informe.docx",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Error al generar documento" }), {
      status: 500,
    });
  }
}