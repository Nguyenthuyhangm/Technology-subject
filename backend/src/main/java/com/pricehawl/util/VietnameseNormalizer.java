package com.pricehawl.util;

import java.text.Normalizer;
import java.util.regex.Pattern;

public final class VietnameseNormalizer {

    private static final Pattern DIACRITICS = Pattern.compile(
            "\\p{InCombiningDiacriticalMarks}+"
    );

    private VietnameseNormalizer() {}

    public static String normalize(String input) {
        if (input == null || input.isBlank()) return "";
        String nfd = Normalizer.normalize(input.toLowerCase(), Normalizer.Form.NFD);
        return DIACRITICS.matcher(nfd).replaceAll("")
                .replaceAll("đ", "d");
    }
}
