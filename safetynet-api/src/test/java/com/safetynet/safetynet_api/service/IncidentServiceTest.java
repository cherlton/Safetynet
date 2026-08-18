package com.safetynet.safetynet_api.service;

import com.safetynet.safetynet_api.dto.IncidentPatternDTO;
import com.safetynet.safetynet_api.dto.IncidentReportDetailsDTO;
import com.safetynet.safetynet_api.dto.WhatsAppMessageDTO;
import com.safetynet.safetynet_api.entity.IncidentReport;
import com.safetynet.safetynet_api.repository.IncidentReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class IncidentServiceTest {

    @Mock
    private GeminiAIService aiService;

    @Mock
    private IncidentReportRepository incidentReportRepository;

    @InjectMocks
    private IncidentService incidentService;

    private WhatsAppMessageDTO messageDTO;
    private IncidentPatternDTO patternDTO;

    @BeforeEach
    void setUp() {
        messageDTO = new WhatsAppMessageDTO();
        messageDTO.setFrom("whatsapp:+27123456789");
        messageDTO.setBody("There is a cable theft happening on 5th Street!");
        messageDTO.setLatitude("-25.7479");
        messageDTO.setLongitude("28.2293");

        patternDTO = new IncidentPatternDTO();
        patternDTO.setCrimeType("CABLE_THEFT");
        patternDTO.setInfrastructureTarget("ELECTRICAL_GRID");
        patternDTO.setSeverity(4);
        patternDTO.setKeywords(List.of("cable", "theft", "street"));
        patternDTO.setEstimatedTime("RIGHT_NOW");
    }

    @Test
    void testProcessIngest_Success() {
        // Arrange
        String redactedText = "[REDACTED] cable theft happening on [REDACTED]!";
        IncidentReportDetailsDTO detailsDTO = IncidentReportDetailsDTO.builder()
                .isAnonymous(false)
                .reporterName("Sipho Khumalo")
                .reporterContact("+27835559876")
                .reporterLocation("municipal depot")
                .cleanText(redactedText)
                .build();

        when(aiService.extractReportDetails(any())).thenReturn(detailsDTO);
        when(aiService.extractPattern(any())).thenReturn(patternDTO);
        when(aiService.scoreUrgency(any())).thenReturn(8);

        IncidentReport mockSavedReport = IncidentReport.builder()
                .id(1L)
                .cleanText(redactedText)
                .crimeType("CABLE_THEFT")
                .severity(4)
                .urgency(8)
                .status("PROCESSED")
                .reporterName("Sipho Khumalo")
                .reporterContact("+27835559876")
                .reporterLocation("municipal depot")
                .whatsappNumber("+27123456789")
                .isAnonymous(false)
                .build();
        when(incidentReportRepository.save(any(IncidentReport.class))).thenReturn(mockSavedReport);

        // Act
        IncidentReport result = incidentService.processIngest(messageDTO);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("PROCESSED", result.getStatus());
        assertEquals("CABLE_THEFT", result.getCrimeType());
        assertEquals(4, result.getSeverity());
        assertEquals(8, result.getUrgency());

        // Verify all components were called with expected arguments
        verify(aiService).extractReportDetails(messageDTO.getBody());
        verify(aiService).extractPattern(redactedText);
        verify(aiService).scoreUrgency(redactedText);
        verify(incidentReportRepository).save(any(IncidentReport.class));
    }
}
