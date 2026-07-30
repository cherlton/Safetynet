package com.safetynet.safetynet_api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safetynet.safetynet_api.dto.ClaudeResponse;
import com.safetynet.safetynet_api.dto.IncidentPatternDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AnthropicAIServiceTest {

    @Mock
    private WebClient.Builder webClientBuilder;

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private WebClient.RequestBodySpec requestBodySpec;

    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    private AnthropicAIService aiService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();

        // Mock WebClient.Builder fluent chain on initialization
        when(webClientBuilder.baseUrl(anyString())).thenReturn(webClientBuilder);
        when(webClientBuilder.build()).thenReturn(webClient);

        aiService = new AnthropicAIService(webClientBuilder, objectMapper);
        ReflectionTestUtils.setField(aiService, "apiKey", "test-api-key");
        ReflectionTestUtils.setField(aiService, "model", "claude-3-5-sonnet-20241022");
    }

    @Test
    void testRedactPII_Success() {
        // Arrange
        String rawReport = "My name is John Doe, call me at +27821112222.";
        String expectedText = "My name is [REDACTED], call me at [REDACTED].";

        ClaudeResponse mockResponse = new ClaudeResponse();
        ClaudeResponse.ContentBlock block = new ClaudeResponse.ContentBlock();
        block.setType("text");
        block.setText(expectedText);
        mockResponse.setContent(List.of(block));

        // Mock the entire WebClient fluent interface
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.header(anyString(), any())).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(ClaudeResponse.class)).thenReturn(Mono.just(mockResponse));

        // Act
        String result = aiService.redactPII(rawReport);

        // Assert
        assertEquals(expectedText, result);
        verify(webClient).post();
    }

    @Test
    void testExtractPattern_Success() throws Exception {
        // Arrange
        String cleanText = "There is a cable theft happening on 5th Street!";
        String jsonResponse = "{\n" +
                "  \"crime_type\": \"CABLE_THEFT\",\n" +
                "  \"infrastructure_target\": \"ELECTRICAL_GRID\",\n" +
                "  \"severity\": 4,\n" +
                "  \"keywords\": [\"cable\", \"theft\"],\n" +
                "  \"estimated_time\": \"RIGHT_NOW\"\n" +
                "}";

        ClaudeResponse mockResponse = new ClaudeResponse();
        ClaudeResponse.ContentBlock block = new ClaudeResponse.ContentBlock();
        block.setType("text");
        block.setText(jsonResponse);
        mockResponse.setContent(List.of(block));

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.header(anyString(), any())).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(ClaudeResponse.class)).thenReturn(Mono.just(mockResponse));

        // Act
        IncidentPatternDTO result = aiService.extractPattern(cleanText);

        // Assert
        assertNotNull(result);
        assertEquals("CABLE_THEFT", result.getCrimeType());
        assertEquals("ELECTRICAL_GRID", result.getInfrastructureTarget());
        assertEquals(4, result.getSeverity());
        assertTrue(result.getKeywords().contains("cable"));
        assertEquals("RIGHT_NOW", result.getEstimatedTime());
    }

    @Test
    void testScoreUrgency_Success() {
        // Arrange
        String cleanText = "Armed robbery in progress, shots fired, immediate help needed!";
        String mockScore = "9";

        ClaudeResponse mockResponse = new ClaudeResponse();
        ClaudeResponse.ContentBlock block = new ClaudeResponse.ContentBlock();
        block.setType("text");
        block.setText(mockScore);
        mockResponse.setContent(List.of(block));

        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.header(anyString(), any())).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(ClaudeResponse.class)).thenReturn(Mono.just(mockResponse));

        // Act
        Integer result = aiService.scoreUrgency(cleanText);

        // Assert
        assertEquals(9, result);
    }
}
