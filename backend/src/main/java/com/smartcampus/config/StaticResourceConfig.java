package com.smartcampus.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        
        String projectRoot = Paths.get(System.getProperty("user.dir"))
                                  .toAbsolutePath()
                                  .normalize()
                                  .toString();

        
        String uploadLocation = "file:" + projectRoot + "/uploads/";

        registry
            .addResourceHandler("/uploads/**")
            .addResourceLocations(uploadLocation)
            .setCachePeriod(3600); 
    }
}