import PDFDocument from "pdfkit";
import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";

interface AnalyticsData {
  dateRange: string;
  tab: string;
  metrics: Record<string, any>;
  charts: Array<{
    title: string;
    data: any[];
  }>;
}

export async function generateAnalyticsReportPDF(
  analyticsData: AnalyticsData
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database connection failed');
      }

      // Fetch restaurant settings
      const settingsRows = await db.select().from(siteSettings);
      const settingsMap: Record<string, string> = {};
      settingsRows.forEach((s: any) => {
        settingsMap[s.settingKey] = s.settingValue;
      });

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header - Restaurant Name
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(settingsMap.restaurant_name || "Boomiis Restaurant", {
          align: "center",
        });

      doc.moveDown(0.5);

      // Report Title
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("ANALYTICS REPORT", { align: "center" });

      doc.moveDown(0.5);

      // Date Range and Tab
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Report Type: ${analyticsData.tab}`, { align: "center" });
      doc.text(`Period: ${analyticsData.dateRange}`, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, {
        align: "center",
      });

      doc.moveDown(1.5);

      // Key Metrics Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Key Metrics", 50, doc.y);
      doc.moveDown(0.5);

      // Draw metrics in a grid
      const metrics = Object.entries(analyticsData.metrics);
      const metricsPerRow = 2;
      const metricWidth = 230;
      const metricHeight = 60;
      let metricX = 50;
      let metricY = doc.y;

      metrics.forEach(([key, value], index) => {
        if (index > 0 && index % metricsPerRow === 0) {
          metricX = 50;
          metricY += metricHeight + 10;
        }

        // Draw metric box
        doc
          .rect(metricX, metricY, metricWidth, metricHeight)
          .stroke();

        // Metric label
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(
            key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())
              .trim(),
            metricX + 10,
            metricY + 10,
            { width: metricWidth - 20 }
          );

        // Metric value
        doc
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(
            typeof value === "number"
              ? value.toLocaleString()
              : value.toString(),
            metricX + 10,
            metricY + 30,
            { width: metricWidth - 20 }
          );

        metricX += metricWidth + 20;
      });

      doc.y = metricY + metricHeight + 20;
      doc.moveDown(1);

      // Charts Data Section
      analyticsData.charts.forEach((chart, chartIndex) => {
        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
        }

        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(chart.title, 50, doc.y);
        doc.moveDown(0.5);

        // Draw simple table for chart data
        const tableTop = doc.y;
        const rowHeight = 20;
        const colWidth = 150;

        if (chart.data && chart.data.length > 0) {
          // Get column headers from first data item
          const headers = Object.keys(chart.data[0]);
          const numCols = Math.min(headers.length, 3); // Limit to 3 columns

          // Draw headers
          doc.fontSize(9).font("Helvetica-Bold");
          headers.slice(0, numCols).forEach((header, colIndex) => {
            doc.text(
              header
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())
                .trim(),
              50 + colIndex * colWidth,
              tableTop,
              { width: colWidth - 10 }
            );
          });

          // Draw header line
          doc
            .moveTo(50, tableTop + 15)
            .lineTo(50 + numCols * colWidth, tableTop + 15)
            .stroke();

          // Draw data rows (limit to 10 rows to fit on page)
          doc.font("Helvetica");
          const maxRows = Math.min(chart.data.length, 10);
          
          for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const row = chart.data[rowIndex];
            const rowY = tableTop + 20 + rowIndex * rowHeight;

            headers.slice(0, numCols).forEach((header, colIndex) => {
              let value = row[header];
              
              // Format value
              if (typeof value === "number") {
                value = value.toLocaleString();
              } else if (value === null || value === undefined) {
                value = "-";
              }

              doc.text(
                value.toString(),
                50 + colIndex * colWidth,
                rowY,
                { width: colWidth - 10 }
              );
            });
          }

          doc.y = tableTop + 20 + maxRows * rowHeight + 10;
        } else {
          doc.fontSize(9).font("Helvetica").text("No data available");
        }

        doc.moveDown(1);
      });

      // Footer
      const footerY = doc.page.height - 80;
      if (doc.y < footerY) {
        doc
          .moveTo(50, footerY)
          .lineTo(550, footerY)
          .stroke();

        doc
          .fontSize(9)
          .font("Helvetica")
          .text(
            `${settingsMap.restaurant_name || "Boomiis Restaurant"} | ${settingsMap.phone || "+44 20 1234 5678"} | ${settingsMap.email || "hello@boomiis.uk"}`,
            50,
            footerY + 10,
            { align: "center" }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
