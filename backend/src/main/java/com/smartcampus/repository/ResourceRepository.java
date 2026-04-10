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
    //List<Resource> findByLocationContaining(String location);
    //List<Resource> findByNameContaining(String name);

    // Search by name or location (case-insensitive)
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

    // Find resources due for maintenance
   @Query(value = """
    SELECT * FROM resources r
    WHERE r.maintenance_interval_days IS NOT NULL
      AND r.last_maintenance_date IS NOT NULL
      AND r.last_maintenance_date < DATE_SUB(NOW(), INTERVAL r.maintenance_interval_days DAY)
    """, nativeQuery = true)
List<Resource> findResourcesDueForMaintenance();

    // Find by QR code for equipment tracking
    Resource findByQrCode(String qrCode);

    // @Query("SELECT r FROM Resource r WHERE " +
    //        "(:type IS NULL OR r.type = :type) AND " +
    //        "(:status IS NULL OR r.status = :status) AND " +
    //        "(:location IS NULL OR r.location LIKE %:location%) AND " +
    //        "(:name IS NULL OR r.name LIKE %:name%)")
    // List<Resource> searchResources(@Param("type") ResourceType type,
    //                                @Param("status") ResourceStatus status,
    //                                @Param("location") String location,
    //                                @Param("name") String name);

}
