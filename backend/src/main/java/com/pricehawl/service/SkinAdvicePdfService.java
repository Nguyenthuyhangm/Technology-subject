package com.pricehawl.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.*;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.pricehawl.dto.SkinRoutineStepProductDTO;
import com.pricehawl.entity.SkinAdviceTemplate;
import com.pricehawl.entity.UserSkinReport;
import com.pricehawl.repository.SkinAdviceTemplateRepository;
import com.pricehawl.repository.UserSkinReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SkinAdvicePdfService {

    private final UserSkinReportRepository reportRepository;
    private final SkinAdviceTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    @Value("${pdf.font-path:}")
    private String configuredFontPath;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    public ResponseEntity<byte[]> downloadPdf(UUID reportId) {
        UserSkinReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy báo cáo"));

        SkinAdviceTemplate template = templateRepository.findById(report.getTemplateId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nội dung báo cáo"));

        byte[] pdfBytes = generatePdf(template);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename("pricehawk-skin-advice.pdf")
                        .build()
        );

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    private byte[] generatePdf(SkinAdviceTemplate template) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();

            Document document = new Document(PageSize.A4, 34, 34, 32, 32);
            PdfWriter.getInstance(document, out);
            document.open();

            BaseFont baseFont = BaseFont.createFont(
                    resolveFontPath(),
                    BaseFont.IDENTITY_H,
                    BaseFont.EMBEDDED
            );

            Font titleFont = new Font(baseFont, 22, Font.BOLD, new Color(31, 26, 23));
            Font subTitleFont = new Font(baseFont, 10, Font.NORMAL, new Color(125, 108, 103));
            Font sectionFont = new Font(baseFont, 14, Font.BOLD, new Color(31, 26, 23));
            Font cardTitleFont = new Font(baseFont, 11, Font.BOLD, new Color(31, 26, 23));
            Font normalFont = new Font(baseFont, 9.5f, Font.NORMAL, new Color(70, 62, 58));
            Font smallFont = new Font(baseFont, 8.5f, Font.NORMAL, new Color(120, 104, 98));
            Font accentFont = new Font(baseFont, 9, Font.BOLD, new Color(183, 132, 140));
            Font whiteFont = new Font(baseFont, 9, Font.BOLD, Color.WHITE);

            RoutineProducts routineProducts = parseRoutineProducts(template.getRoutineProductsJson());

            addHeader(document, titleFont, subTitleFont);
            addOverview(document, template, sectionFont, normalFont, smallFont);
            addScoreCards(document, template, sectionFont, normalFont, accentFont);
            addRoutineSection(
                    document,
                    "Routine buổi sáng",
                    "Làm sạch nhẹ, cấp ẩm và bảo vệ da ban ngày.",
                    routineProducts.morning(),
                    sectionFont,
                    cardTitleFont,
                    normalFont,
                    smallFont,
                    accentFont,
                    whiteFont
            );
            addRoutineSection(
                    document,
                    "Routine buổi tối",
                    "Làm sạch kỹ hơn, treatment nhẹ nếu cần và phục hồi da.",
                    routineProducts.night(),
                    sectionFont,
                    cardTitleFont,
                    normalFont,
                    smallFont,
                    accentFont,
                    whiteFont
            );
            addNotes(document, template, sectionFont, normalFont);

            document.close();

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo PDF", e);
        }
    }

    private void addHeader(
            Document document,
            Font titleFont,
            Font subTitleFont
    ) throws DocumentException {
        Paragraph title = new Paragraph("PriceHawk AI - Skin Advice Report", titleFont);
        title.setSpacingAfter(4);
        document.add(title);

        Paragraph subtitle = new Paragraph(
                "Báo cáo phân tích tình trạng da, routine cá nhân hóa và sản phẩm gợi ý từ hệ thống PriceHawk.",
                subTitleFont
        );
        subtitle.setSpacingAfter(18);
        document.add(subtitle);
    }

    private void addOverview(
            Document document,
            SkinAdviceTemplate template,
            Font sectionFont,
            Font normalFont,
            Font smallFont
    ) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2.1f, 1f});
        table.setSpacingAfter(16);

        PdfPCell left = cardCell();
        left.addElement(new Paragraph("Tổng quan tình trạng da", sectionFont));
        left.addElement(space(5));
        left.addElement(new Paragraph(
                nullToDefault(template.getSkinOverview(), template.getSummary()),
                normalFont
        ));

        PdfPCell right = cardCell();
        right.addElement(new Paragraph("Thông tin nhanh", sectionFont));
        right.addElement(space(5));
        right.addElement(new Paragraph("Loại da: " + nullToText(template.getSkinType()), smallFont));
        right.addElement(new Paragraph("Độ nhạy cảm: " + nullToText(template.getSensitivityLevel()), smallFont));
        right.addElement(new Paragraph("Mức mụn: " + nullToText(template.getAcneLevel()), smallFont));
        right.addElement(new Paragraph("Ngân sách: " + formatBudget(template.getBudgetMin(), template.getBudgetMax()), smallFont));

        table.addCell(left);
        table.addCell(right);

        document.add(table);
    }

    private void addScoreCards(
            Document document,
            SkinAdviceTemplate template,
            Font sectionFont,
            Font normalFont,
            Font accentFont
    ) throws DocumentException {
        Paragraph heading = new Paragraph("Chỉ số tham khảo", sectionFont);
        heading.setSpacingAfter(8);
        document.add(heading);

        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setSpacingAfter(16);

        table.addCell(scoreCell("Hydration", template.getHydrationScore(), normalFont, accentFont));
        table.addCell(scoreCell("Barrier Health", template.getBarrierScore(), normalFont, accentFont));
        table.addCell(scoreCell("Sensitivity", template.getSensitivityScore(), normalFont, accentFont));

        document.add(table);
    }

    private PdfPCell scoreCell(
            String label,
            Integer score,
            Font normalFont,
            Font accentFont
    ) {
        PdfPCell cell = cardCell();

        Paragraph labelText = new Paragraph(label, normalFont);
        labelText.setSpacingAfter(4);
        cell.addElement(labelText);

        Paragraph scoreText = new Paragraph((score == null ? 0 : score) + "/100", accentFont);
        cell.addElement(scoreText);

        return cell;
    }

    private void addRoutineSection(
            Document document,
            String title,
            String description,
            List<SkinRoutineStepProductDTO> products,
            Font sectionFont,
            Font cardTitleFont,
            Font normalFont,
            Font smallFont,
            Font accentFont,
            Font whiteFont
    ) throws DocumentException {
        Paragraph heading = new Paragraph(title, sectionFont);
        heading.setSpacingBefore(4);
        heading.setSpacingAfter(3);
        document.add(heading);

        Paragraph desc = new Paragraph(description, smallFont);
        desc.setSpacingAfter(8);
        document.add(desc);

        if (products == null || products.isEmpty()) {
            Paragraph empty = new Paragraph("Chưa tìm thấy sản phẩm phù hợp trong hệ thống.", normalFont);
            empty.setSpacingAfter(14);
            document.add(empty);
            return;
        }

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1f, 1f});
        table.setSpacingAfter(16);

        for (SkinRoutineStepProductDTO item : products) {
            table.addCell(productStepCell(item, cardTitleFont, normalFont, smallFont, accentFont, whiteFont));
        }

        if (products.size() % 2 != 0) {
            PdfPCell empty = new PdfPCell();
            empty.setBorder(Rectangle.NO_BORDER);
            table.addCell(empty);
        }

        document.add(table);
    }

    private PdfPCell productStepCell(
            SkinRoutineStepProductDTO item,
            Font cardTitleFont,
            Font normalFont,
            Font smallFont,
            Font accentFont,
            Font whiteFont
    ) {
        PdfPCell cell = cardCell();
        cell.setPadding(10);

        Paragraph step = new Paragraph(nullToText(item.getStepLabel()), cardTitleFont);
        step.setSpacingAfter(6);
        cell.addElement(step);

        PdfPTable inner = new PdfPTable(2);
        inner.setWidthPercentage(100);

        try {
            inner.setWidths(new float[]{0.72f, 1.6f});
        } catch (Exception ignored) {
        }

        PdfPCell imgCell = new PdfPCell();
        imgCell.setBorder(Rectangle.NO_BORDER);
        imgCell.setPadding(0);
        imgCell.setPaddingRight(8);

        Image image = loadProductImage(item.getImageUrl());
        if (image != null) {
            image.scaleToFit(80, 80);
            image.setAlignment(Image.ALIGN_CENTER);
            imgCell.addElement(image);
        } else {
            PdfPCell placeholder = new PdfPCell(new Phrase("No image", smallFont));
            placeholder.setFixedHeight(70);
            placeholder.setHorizontalAlignment(Element.ALIGN_CENTER);
            placeholder.setVerticalAlignment(Element.ALIGN_MIDDLE);
            placeholder.setBorderColor(new Color(238, 228, 225));
            placeholder.setBackgroundColor(new Color(252, 246, 247));
            imgCell.addElement(placeholder);
        }

        PdfPCell infoCell = new PdfPCell();
        infoCell.setBorder(Rectangle.NO_BORDER);
        infoCell.setPadding(0);

        Paragraph name = new Paragraph(nullToText(item.getProductName()), normalFont);
        name.setSpacingAfter(4);
        infoCell.addElement(name);

        Paragraph meta = new Paragraph(
                nullToText(item.getBrandName()) + " • " + nullToText(item.getCategoryName()),
                smallFont
        );
        meta.setSpacingAfter(4);
        infoCell.addElement(meta);

        Paragraph price = new Paragraph(formatPrice(item.getLowestPrice()), accentFont);
        price.setSpacingAfter(4);
        infoCell.addElement(price);

        Paragraph reason = new Paragraph(nullToText(item.getReason()), smallFont);
        infoCell.addElement(reason);

        inner.addCell(imgCell);
        inner.addCell(infoCell);

        cell.addElement(inner);

        return cell;
    }

    private void addNotes(
            Document document,
            SkinAdviceTemplate template,
            Font sectionFont,
            Font normalFont
    ) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1f, 1f});
        table.setSpacingAfter(10);

        PdfPCell avoid = cardCell();
        avoid.addElement(new Paragraph("Nên tránh", sectionFont));
        avoid.addElement(space(5));
        avoid.addElement(new Paragraph(
                nullToDefault(
                        template.getAvoidNotes(),
                        "Tránh tẩy da chết quá mức, treatment mạnh hoặc sản phẩm dễ gây kích ứng."
                ),
                normalFont
        ));

        PdfPCell note = cardCell();
        note.addElement(new Paragraph("Lưu ý", sectionFont));
        note.addElement(space(5));
        note.addElement(new Paragraph(
                nullToDefault(
                        template.getWarningNotes(),
                        "Nếu da đỏ rát, bong tróc kéo dài hoặc mụn viêm nặng, nên hỏi bác sĩ da liễu."
                ),
                normalFont
        ));

        table.addCell(avoid);
        table.addCell(note);

        document.add(table);
    }

    private RoutineProducts parseRoutineProducts(String json) {
        if (json == null || json.isBlank()) {
            return new RoutineProducts(List.of(), List.of());
        }

        try {
            Map<String, List<SkinRoutineStepProductDTO>> map =
                    objectMapper.readValue(
                            json,
                            new TypeReference<Map<String, List<SkinRoutineStepProductDTO>>>() {
                            }
                    );

            return new RoutineProducts(
                    map.getOrDefault("morning", List.of()),
                    map.getOrDefault("night", List.of())
            );
        } catch (Exception e) {
            return new RoutineProducts(List.of(), List.of());
        }
    }

    private PdfPCell cardCell() {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(12);
        cell.setBorderColor(new Color(238, 228, 225));
        cell.setBackgroundColor(new Color(255, 250, 248));
        return cell;
    }

    private Paragraph space(float height) {
        Paragraph p = new Paragraph(" ");
        p.setSpacingAfter(height);
        return p;
    }

    private Image loadProductImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        try {
            String finalUrl = imageUrl.trim();

            if (finalUrl.startsWith("/")) {
                finalUrl = publicBaseUrl + finalUrl;
            }

            Image image = Image.getInstance(finalUrl);
            image.setAlignment(Image.ALIGN_CENTER);
            return image;
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveFontPath() {
        if (configuredFontPath != null && !configuredFontPath.isBlank()) {
            return configuredFontPath;
        }

        List<String> candidates = List.of(
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/tahoma.ttf",
                "C:/Windows/Fonts/segoeui.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
        );

        for (String path : candidates) {
            if (new File(path).exists()) {
                return path;
            }
        }

        throw new RuntimeException("Không tìm thấy font Unicode để xuất PDF tiếng Việt");
    }

    private String nullToText(String value) {
        return value == null || value.isBlank() ? "Chưa rõ" : value;
    }

    private String nullToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String formatBudget(Integer min, Integer max) {
        if (min == null && max == null) {
            return "Chưa rõ";
        }

        String minText = min == null ? "0" : String.format("%,d", min).replace(",", ".");
        String maxText = max == null ? "không giới hạn" : String.format("%,d", max).replace(",", ".") + "đ";

        return minText + "đ - " + maxText;
    }

    private String formatPrice(Integer price) {
        if (price == null) {
            return "Chưa có giá";
        }

        return String.format("%,d", price).replace(",", ".") + "đ";
    }

    private record RoutineProducts(
            List<SkinRoutineStepProductDTO> morning,
            List<SkinRoutineStepProductDTO> night
    ) {
    }
}