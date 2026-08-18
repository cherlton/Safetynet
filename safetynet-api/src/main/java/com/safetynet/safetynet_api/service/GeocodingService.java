package com.safetynet.safetynet_api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Service
@Slf4j
public class GeocodingService {

    @Value("${google.maps.api-key:}")
    private String googleApiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public GeocodingService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder
                .defaultHeader("User-Agent", "SafetyNet-Crime-Platform/1.0 (contact@safetynet.org)")
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * Converts GPS Coordinates into a human-readable street address using Google Maps or OpenStreetMap.
     */
    public String reverseGeocode(double lat, double lng) {
        // 1. Try Google Maps Geocoding API if key is provided
        if (googleApiKey != null && !googleApiKey.isBlank()) {
            try {
                log.info("Reverse geocoding via Google Maps API: lat={}, lng={}", lat, lng);
                String response = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .scheme("https")
                                .host("maps.googleapis.com")
                                .path("/maps/api/geocode/json")
                                .queryParam("latlng", lat + "," + lng)
                                .queryParam("key", googleApiKey)
                                .build())
                        .retrieve()
                        .bodyToMono(String.class)
                        .timeout(Duration.ofSeconds(4))
                        .block();

                if (response != null && !response.isBlank()) {
                    JsonNode root = objectMapper.readTree(response);
                    if ("OK".equalsIgnoreCase(root.path("status").asText())) {
                        JsonNode results = root.path("results");
                        if (results.isArray() && results.size() > 0) {
                            String formattedAddress = results.get(0).path("formatted_address").asText();
                            log.info("Google Maps resolved address: {}", formattedAddress);
                            return formattedAddress;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Google Maps reverse geocode failed: {}", e.getMessage());
            }
        }

        // 2. OpenStreetMap Nominatim Fallback
        try {
            log.info("Reverse geocoding via OpenStreetMap: lat={}, lng={}", lat, lng);
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("nominatim.openstreetmap.org")
                            .path("/reverse")
                            .queryParam("format", "json")
                            .queryParam("lat", lat)
                            .queryParam("lon", lng)
                            .queryParam("zoom", 18)
                            .queryParam("addressdetails", 1)
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(4))
                    .block();

            if (response != null && !response.isBlank()) {
                JsonNode root = objectMapper.readTree(response);
                String displayName = root.path("display_name").asText(null);
                if (displayName != null && !displayName.isBlank()) {
                    log.info("Resolved reverse geocode address: {}", displayName);
                    return displayName;
                }
            }
        } catch (Exception e) {
            log.warn("Reverse geocoding failed for [{}, {}]: {}", lat, lng, e.getMessage());
        }

        return String.format("%.4f, %.4f (South Africa)", lat, lng);
    }

    /**
     * Converts a text street address / suburb into real [lat, lng] coordinates using Google Maps or OpenStreetMap.
     */
    public double[] geocodeAddress(String addressText) {
        if (addressText == null || addressText.isBlank()) {
            return new double[]{-26.2041, 28.0473}; // Default to Johannesburg CBD
        }

        String query = addressText.trim();
        if (!query.toLowerCase().contains("south africa") && !query.toLowerCase().contains("gauteng")
                && !query.toLowerCase().contains("cape") && !query.toLowerCase().contains("natal")) {
            query = query + ", South Africa";
        }
        final String finalSearchQuery = query;

        // 1. Try Google Maps Geocoding API if key is provided
        if (googleApiKey != null && !googleApiKey.isBlank()) {
            try {
                log.info("Geocoding via Google Maps API: {}", finalSearchQuery);
                String response = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .scheme("https")
                                .host("maps.googleapis.com")
                                .path("/maps/api/geocode/json")
                                .queryParam("address", finalSearchQuery)
                                .queryParam("components", "country:ZA")
                                .queryParam("key", googleApiKey)
                                .build())
                        .retrieve()
                        .bodyToMono(String.class)
                        .timeout(Duration.ofSeconds(4))
                        .block();

                if (response != null && !response.isBlank()) {
                    JsonNode root = objectMapper.readTree(response);
                    if ("OK".equalsIgnoreCase(root.path("status").asText())) {
                        JsonNode results = root.path("results");
                        if (results.isArray() && results.size() > 0) {
                            JsonNode location = results.get(0).path("geometry").path("location");
                            double lat = location.path("lat").asDouble();
                            double lng = location.path("lng").asDouble();
                            log.info("Google Maps resolved coordinates for '{}': [{}, {}]", addressText, lat, lng);
                            return new double[]{lat, lng};
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Google Maps geocoding failed: {}", e.getMessage());
            }
        }

        // 2. OpenStreetMap Nominatim Fallback
        try {
            log.info("Geocoding address text via OpenStreetMap: {}", finalSearchQuery);
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("nominatim.openstreetmap.org")
                            .path("/search")
                            .queryParam("format", "json")
                            .queryParam("q", finalSearchQuery)
                            .queryParam("limit", 1)
                            .queryParam("countrycodes", "za")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(4))
                    .block();

            if (response != null && !response.isBlank()) {
                JsonNode array = objectMapper.readTree(response);
                if (array.isArray() && array.size() > 0) {
                    JsonNode first = array.get(0);
                    double lat = Double.parseDouble(first.path("lat").asText());
                    double lon = Double.parseDouble(first.path("lon").asText());
                    log.info("Resolved coordinates for '{}': lat={}, lon={}", addressText, lat, lon);
                    return new double[]{lat, lon};
                }
            }
        } catch (Exception e) {
            log.warn("Geocoding failed for '{}': {}", addressText, e.getMessage());
        }

        // Known South African fallback mapping
        String lower = addressText.toLowerCase();
        if (lower.contains("sandton")) return new double[]{-26.1076, 28.0567};
        if (lower.contains("rosebank")) return new double[]{-26.1438, 28.0416};
        if (lower.contains("soweto")) return new double[]{-26.2678, 27.8585};
        if (lower.contains("pretoria") || lower.contains("tshwane")) return new double[]{-25.7479, 28.1878};
        if (lower.contains("cape town") || lower.contains("bellville") || lower.contains("mitchell")) return new double[]{-33.9249, 18.4241};
        if (lower.contains("durban") || lower.contains("umhlanga")) return new double[]{-29.8587, 31.0218};
        if (lower.contains("gqeberha") || lower.contains("port elizabeth")) return new double[]{-33.9608, 25.6022};

        return new double[]{-26.2041, 28.0473}; // Default to Johannesburg
    }
}
