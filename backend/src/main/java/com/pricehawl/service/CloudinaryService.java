package com.pricehawl.service;

import com.cloudinary.Cloudinary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public void deleteResource(String publicId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) cloudinary.uploader().destroy(publicId, Map.of());
            log.info("Cloudinary delete result for publicId={}: {}", publicId, result);
        } catch (Exception e) {
            log.error("Failed to delete resource from Cloudinary: publicId={}", publicId, e);
        }
    }

    public Map<String, Object> uploadVideo(byte[] videoBytes, String filename) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) cloudinary.uploader().upload(videoBytes, Map.of(
                "resource_type", "video",
                "folder", "pricehawl/videos",
                "public_id", filename
            ));
            Object durationRaw = result.get("duration");
            int duration = durationRaw != null ? ((Number) durationRaw).intValue() : 0;
            String publicId = (String) result.get("public_id");
            String thumbnailUrl = buildThumbnailUrl(publicId);
            return Map.of(
                "url", result.get("secure_url"),
                "publicId", publicId,
                "duration", duration,
                "thumbnailUrl", thumbnailUrl
            );
        } catch (Exception e) {
            log.error("Failed to upload video: {}", filename, e);
            throw new RuntimeException("Upload video failed: " + e.getMessage(), e);
        }
    }

    private String buildThumbnailUrl(String publicId) {
        if (publicId == null || publicId.isBlank()) return null;
        return cloudinary.url()
            .resourceType("video")
            .publicId(publicId)
            .transformation(new com.cloudinary.Transformation()
                .quality("auto")
                .fetchFormat("auto")
                .width(640)
                .height(360)
                .crop("fill"))
            .generate(publicId + ".jpg");
    }
}
