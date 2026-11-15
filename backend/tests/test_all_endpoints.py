"""
Comprehensive Endpoint & Architectural Verification Suite
Audits all registered REST endpoints, error handlers, query parameter validations,
and payload responses in TerraScope.
"""

import json
import sys
from pathlib import Path
import unittest

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app import create_app
from backend.config import TestingConfig


class TestAllEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app(TestingConfig)
        cls.client = cls.app.test_client()

    def test_01_root_catalog(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("service", data)
        self.assertIn("endpoints", data)
        self.assertEqual(data["service"], "TerraScope Earth System Trend Detective API")

    def test_02_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "terrascope-api")

    def test_03_states(self):
        res = self.client.get("/api/states")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["total"], 36)
        self.assertEqual(len(data["states"]), 36)
        names = [s["name"] for s in data["states"]]
        self.assertIn("Kerala", names)
        self.assertIn("Ladakh", names)

    def test_04_boundaries_default_adm1(self):
        res = self.client.get("/api/boundaries?iso3=IND&adm=ADM1")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertTrue(len(data["features"]) > 0)

    def test_05_boundaries_adm2_kerala(self):
        res = self.client.get("/api/boundaries?iso3=IND&adm=ADM2&parent=Kerala")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertEqual(len(data["features"]), 14, "Kerala must have 14 separate districts")

    def test_06_boundaries_world_adm0(self):
        res = self.client.get("/api/boundaries?iso3=WORLD&adm=ADM0")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertTrue(len(data["features"]) > 100)

    def test_07_boundaries_metadata(self):
        res = self.client.get("/api/boundaries/meta")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("attribution", data)
        self.assertIn("levels", data)

    def test_08_search_locations(self):
        # Short query returns empty suggestions
        res = self.client.get("/api/search?q=k")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()["suggestions"]), 0)

        # Full query returns matches
        res = self.client.get("/api/search?q=Kerala")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["total"] > 0)
        self.assertEqual(data["suggestions"][0]["name"], "Kerala")

        # Global city search
        res = self.client.get("/api/search?q=Tokyo")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["total"] > 0)
        names = [s["name"] for s in data["suggestions"]]
        self.assertIn("Tokyo", names)

    def test_09_geocode(self):
        # Missing q returns 400
        res = self.client.get("/api/geocode")
        self.assertEqual(res.status_code, 400)

        # Valid q
        res = self.client.get("/api/geocode?q=Kerala")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertAlmostEqual(data["coordinates"][0], 10.8505, delta=1.0)

    def test_10_reverse_geocode(self):
        # Missing params returns 400
        res = self.client.get("/api/reverse")
        self.assertEqual(res.status_code, 400)

        # Valid params
        res = self.client.get("/api/reverse?lat=10.8505&lon=76.2711")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")

        # Location reverse alias
        res2 = self.client.get("/api/location/reverse?lat=10.8505&lon=76.2711")
        self.assertEqual(res2.status_code, 200)

    def test_11_variables(self):
        res = self.client.get("/api/variables")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        var_ids = [v["id"] for v in data["variables"]]
        self.assertIn("temperature", var_ids)
        self.assertIn("precipitation", var_ids)
        self.assertIn("soil_moisture", var_ids)
        self.assertIn("water_surface", var_ids)

    def test_12_analysis_state(self):
        payload = {
            "location": {"type": "state", "name": "Kerala"},
            "variables": ["temperature"],
            "start_date": "2000-01-01",
            "end_date": "2024-12-31",
            "aggregation": "yearly"
        }
        res = self.client.post("/api/analysis", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["period"]["start"], "2000")
        self.assertEqual(data["period"]["end"], "2024")
        self.assertTrue(len(data["results"]) > 0)
        result = data["results"][0]
        self.assertIn("trend", result)
        self.assertIn("slope_per_decade", result["trend"])
        self.assertIn("series", result)
        self.assertTrue(len(result["series"]) >= 20)

    def test_13_analysis_point_coordinates(self):
        payload = {
            "location": {
                "type": "point",
                "name": "Custom Point",
                "coordinates": [35.6762, 139.6503]
            },
            "variables": ["temperature"],
            "start_date": "2005",
            "end_date": "2020",
            "aggregation": "yearly"
        }
        res = self.client.post("/api/analysis", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["period"]["start"], "2005")
        self.assertEqual(data["period"]["end"], "2020")
        self.assertEqual(len(data["results"][0]["series"]), 16)

    def test_14_analysis_district_and_country(self):
        # District
        payload_dist = {
            "location": {"type": "district", "name": "Wayanad"},
            "variables": ["temperature"],
            "start_date": "2000",
            "end_date": "2024"
        }
        res = self.client.post("/api/analysis", json=payload_dist)
        self.assertEqual(res.status_code, 200)

        # Country
        payload_country = {
            "location": {"type": "country", "name": "France"},
            "variables": ["temperature"],
            "start_date": "2000",
            "end_date": "2024"
        }
        res = self.client.post("/api/analysis", json=payload_country)
        self.assertEqual(res.status_code, 200)

    def test_15_analysis_validation_errors(self):
        # Invalid payload (not json)
        res = self.client.post("/api/analysis", data="not json", content_type="text/plain")
        self.assertEqual(res.status_code, 400)

        # Missing variables
        res = self.client.post("/api/analysis", json={"location": {"type": "state", "name": "Kerala"}})
        self.assertEqual(res.status_code, 400)

    def test_16_map_trends(self):
        for var in ["temperature", "precipitation", "soil_moisture"]:
            res = self.client.get(f"/api/map-trends?variable={var}&start_date=2000&end_date=2024")
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIn("states", data)
            self.assertIn("districts", data)
            self.assertIn("countries", data)
            self.assertIn("trends", data)
            self.assertIn("kerala", data["trends"])
            self.assertIn("wayanad", data["trends"])
            self.assertIn("united states", data["trends"])

    def test_17_reports(self):
        # Default report as JSON
        res = self.client.get("/api/report/kerala?format=json")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertIn("data", data)

        # Default report as Markdown
        res2 = self.client.get("/api/report/kerala?format=markdown")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertEqual(data2["format"], "markdown")
        self.assertIn("TerraScope Scientific Report", data2["content"])

        # Not found report
        res3 = self.client.get("/api/report/non_existent_12345")
        self.assertEqual(res3.status_code, 404)


if __name__ == "__main__":
    unittest.main()
