package com.smartcampus.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.model.Resource;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;

import java.util.List;

@Repository

public interface ResourceRepository  extends JpaRepository<Resource, Long>{

    List<Resource> findByType(ResourceType type);
    List<Resource> findByStatus(ResourceStatus status);
    List<Resource> findByTypeAndStatus(ResourceType type, ResourceStatus status);
   
    @Query("SELECT r FROM Resource r WHERE " +
        "(:name IS NULL OR LOWER(r.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
        "(:type IS NULL OR r.type = :type) AND " +
        "(:status IS NULL OR r.status = :status) AND " +
        "(:location IS NULL OR LOWER(r.location) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
        "(:minCapacity IS NULL OR r.capacity >= :minCapacity)")
    List<Resource> searchResources(
        @Param("name") String name,
        @Param("type") ResourceType type,
        @Param("status") ResourceStatus status,
        @Param("location") String location,
        @Param("minCapacity") Integer minCapacity
    );

   @Query(value = """
    SELECT * FROM resources r
    WHERE r.maintenance_interval_days IS NOT NULL
      AND r.last_maintenance_date IS NOT NULL
      AND r.last_maintenance_date < DATE_SUB(NOW(), INTERVAL r.maintenance_interval_days DAY)
    """, nativeQuery = true)
List<Resource> findResourcesDueForMaintenance();

    Resource findByQrCode(String qrCode);

   

}