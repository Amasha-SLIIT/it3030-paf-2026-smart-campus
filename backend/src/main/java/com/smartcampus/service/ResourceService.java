package com.smartcampus.service;

import java.util.List;
import java.util.Map;
import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.dto.ResourceRequestDTO;
import com.smartcampus.dto.ResourceResponseDTO;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;

public interface ResourceService {

    ResourceResponseDTO createResource(ResourceRequestDTO dto);
    ResourceResponseDTO getResourceById(Long id);
    List<ResourceResponseDTO> getAllResources();
    List<ResourceResponseDTO> searchResources(String name, ResourceType type, ResourceStatus status, String location, Integer minCapacity);
    ResourceResponseDTO updateResource(Long id, ResourceRequestDTO dto);
    ResourceResponseDTO updateResourceStatus(Long id, ResourceStatus status);
    void deleteResource(Long id);
    ResourceResponseDTO getResourceByQrCode(String qrCode);
    List<ResourceResponseDTO> getResourcesDueForMaintenance();
    ResourceResponseDTO markMaintenanceDone(Long id);
    ResourceResponseDTO uploadResourceImage(Long id, MultipartFile file) throws IOException;
    // ADD – for availability calendar novelty feature
    Map<String, Object> getResourceAvailability(Long id, String weekStart);

}