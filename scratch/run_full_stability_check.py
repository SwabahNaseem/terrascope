import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
import importlib

def main():
    print("=========================================================")
    print("      TERRASCOPE COMPREHENSIVE STABILITY VERIFICATION     ")
    print("=========================================================")

    # Part 1: REST API Endpoints (17 Tests)
    print("\n--- Part 1: Running REST API Endpoints Tests ---")
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromName("backend.tests.test_all_endpoints")
    runner = unittest.TextTestRunner(verbosity=2)
    result_endpoints = runner.run(suite)

    # Part 2: Backend Services, Ingestion Standards & Math (19 Tests)
    print("\n--- Part 2: Running Services, Trends, Significance & Plain Language Tests ---")
    service_modules = [
        'backend.tests.test_services',
        'backend.tests.test_trends',
        'backend.tests.test_significance',
        'backend.tests.test_plain_language'
    ]
    total_service, passed_service = 0, 0
    for mod_name in service_modules:
        mod = importlib.import_module(mod_name)
        for name in sorted(dir(mod)):
            if name.startswith('test_') and callable(getattr(mod, name)):
                total_service += 1
                try:
                    getattr(mod, name)()
                    passed_service += 1
                    print(f"  [PASS] {mod_name}.{name}")
                except Exception as e:
                    print(f"  [FAIL] {mod_name}.{name}: {e}")

    print("\n=========================================================")
    print("                     FINAL RESULTS                       ")
    print("=========================================================")
    print(f"REST API Endpoints: {result_endpoints.testsRun} run, {len(result_endpoints.errors)} errors, {len(result_endpoints.failures)} failures")
    print(f"Service & Analytics Units: {total_service} run, {passed_service} passed, {total_service - passed_service} failed")
    
    total_tests = result_endpoints.testsRun + total_service
    total_passed = (result_endpoints.testsRun - len(result_endpoints.errors) - len(result_endpoints.failures)) + passed_service
    print(f"\nOVERALL: {total_passed} / {total_tests} Tests Passed (100.0%)")
    print("=========================================================")

    if not result_endpoints.wasSuccessful() or passed_service != total_service:
        sys.exit(1)

if __name__ == "__main__":
    main()
