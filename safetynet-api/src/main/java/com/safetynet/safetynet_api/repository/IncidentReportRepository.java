package com.safetynet.safetynet_api.repository;

import com.safetynet.safetynet_api.entity.IncidentReport;
import org.locationtech.jts.geom.Point;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentReportRepository extends JpaRepository<IncidentReport, Long> {

    /**
     * Finds all incidents within a dynamic radius of a center GPS point.
     * Casts spatial coordinates to geography to enable precise metric queries (meters).
     */
    @Query(value = "SELECT * FROM incident_report WHERE ST_DWithin(location::geography, :centerPoint::geography, :radiusInMeters) = true ORDER BY reported_at DESC", nativeQuery = true)
    List<IncidentReport> findIncidentsWithinRadius(
            @Param("centerPoint") Point centerPoint,
            @Param("radiusInMeters") double radiusInMeters
    );
}

