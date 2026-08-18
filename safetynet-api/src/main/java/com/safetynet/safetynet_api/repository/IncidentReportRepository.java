package com.safetynet.safetynet_api.repository;

import com.safetynet.safetynet_api.entity.IncidentReport;
import org.locationtech.jts.geom.Point;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.stream.Collectors;

@Repository
public interface IncidentReportRepository extends JpaRepository<IncidentReport, Long> {

    /**
     * Finds all incidents within a dynamic radius of a center GPS point.
     * Uses Haversine distance calculation so it works on any database (H2, Postgres, etc.)
     */
    default List<IncidentReport> findIncidentsWithinRadius(Point centerPoint, double radiusInMeters) {
        if (centerPoint == null) {
            return findAll();
        }
        double centerLat = centerPoint.getY();
        double centerLng = centerPoint.getX();

        return findAll().stream()
                .filter(report -> {
                    if (report.getLocation() == null) {
                        return false;
                    }
                    double reportLat = report.getLocation().getY();
                    double reportLng = report.getLocation().getX();
                    return calculateHaversineDistance(centerLat, centerLng, reportLat, reportLng) <= radiusInMeters;
                })
                .sorted((a, b) -> {
                    if (a.getReportedAt() == null || b.getReportedAt() == null) return 0;
                    return b.getReportedAt().compareTo(a.getReportedAt());
                })
                .collect(Collectors.toList());
    }

    private static double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Earth radius in meters
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

