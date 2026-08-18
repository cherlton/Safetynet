package com.safetynet.safetynet_api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS is handled exclusively by SecurityConfig's CorsConfigurationSource bean.
 * Do NOT add addCorsMappings here — duplicate CORS configs cause 403 errors
 * when allowCredentials is true.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
}
