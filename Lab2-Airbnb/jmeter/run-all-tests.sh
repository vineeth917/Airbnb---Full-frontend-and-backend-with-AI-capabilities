#!/bin/bash

# Run All JMeter Performance Tests for Lab2 Airbnb
# Tests 100, 200, 300, 400, 500 concurrent users

set -e

echo "=========================================="
echo "Lab2 Airbnb - JMeter Performance Testing"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
TEST_PLAN="airbnb-performance-test.jmx"
RESULTS_DIR="results"
RAMP_UP=60
LOOP_COUNT=10
COOL_DOWN=30  # Seconds to wait between tests

# Create results directory
mkdir -p $RESULTS_DIR

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if JMeter is installed
if ! command -v jmeter &> /dev/null; then
    print_error "JMeter is not installed. Please install JMeter first."
    echo "macOS: brew install jmeter"
    echo "Linux: Download from https://jmeter.apache.org/download_jmeter.cgi"
    exit 1
fi

print_success "JMeter found: $(jmeter --version | head -n 1)"
echo ""

# Check if test plan exists
if [ ! -f "$TEST_PLAN" ]; then
    print_error "Test plan not found: $TEST_PLAN"
    exit 1
fi

print_success "Test plan found: $TEST_PLAN"
echo ""

# Check if services are running
print_warning "Checking if services are running..."
if ! curl -s http://localhost:5001/health > /dev/null 2>&1; then
    print_warning "Traveler Service (port 5001) may not be running"
fi

if ! curl -s http://localhost:5003/health > /dev/null 2>&1; then
    print_warning "Property Service (port 5003) may not be running"
fi

if ! curl -s http://localhost:5004/health > /dev/null 2>&1; then
    print_warning "Booking Service (port 5004) may not be running"
fi

echo ""
print_warning "Make sure all services are running before continuing!"
read -p "Press Enter to start tests or Ctrl+C to cancel..."
echo ""

# Function to run a test
run_test() {
    local threads=$1
    local test_name="test-${threads}users"
    local results_file="${RESULTS_DIR}/results-${threads}users.jtl"
    local html_report_dir="${RESULTS_DIR}/report-${threads}users"
    
    echo "=========================================="
    echo "Running Test: $threads Concurrent Users"
    echo "=========================================="
    echo "  Ramp-up: ${RAMP_UP} seconds"
    echo "  Loop Count: ${LOOP_COUNT} iterations"
    echo "  Total Requests: $((threads * LOOP_COUNT * 5))"  # 5 requests per iteration
    echo ""
    
    # Run JMeter
    jmeter -n -t "$TEST_PLAN" \
        -JTHREADS=$threads \
        -JRAMP_UP=$RAMP_UP \
        -JLOOP_COUNT=$LOOP_COUNT \
        -l "$results_file" \
        -e -o "$html_report_dir" \
        2>&1 | grep -E "(Creating summariser|summary)"
    
    if [ $? -eq 0 ]; then
        print_success "Test completed: $threads users"
        print_success "Results saved to: $results_file"
        print_success "HTML report: $html_report_dir/index.html"
    else
        print_error "Test failed: $threads users"
        return 1
    fi
    
    echo ""
}

# Function to print summary
print_summary() {
    local results_file=$1
    local threads=$2
    
    echo "Quick Summary for $threads users:"
    
    # Extract key metrics from results file
    if [ -f "$results_file" ]; then
        # Count total requests
        total=$(wc -l < "$results_file" | xargs)
        total=$((total - 1))  # Subtract header line
        
        # Count errors (requests with success=false)
        errors=$(grep -c "false" "$results_file" || true)
        
        # Calculate error percentage
        error_pct=$(awk "BEGIN {printf \"%.2f\", ($errors/$total)*100}")
        
        echo "  Total Requests: $total"
        echo "  Errors: $errors ($error_pct%)"
        
        # Note: More detailed metrics are in the HTML report
        echo "  See HTML report for detailed metrics"
    else
        print_warning "Results file not found: $results_file"
    fi
    
    echo ""
}

# Run tests for different load levels
echo "=========================================="
echo "Starting Performance Test Suite"
echo "=========================================="
echo ""
echo "This will run 5 tests with different load levels:"
echo "  1. 100 concurrent users"
echo "  2. 200 concurrent users"
echo "  3. 300 concurrent users"
echo "  4. 400 concurrent users"
echo "  5. 500 concurrent users"
echo ""
echo "Total estimated time: ~30 minutes"
echo ""

start_time=$(date +%s)

# Test 1: 100 users
run_test 100
print_summary "${RESULTS_DIR}/results-100users.jtl" 100
print_warning "Cooling down for ${COOL_DOWN} seconds..."
sleep $COOL_DOWN

# Test 2: 200 users
run_test 200
print_summary "${RESULTS_DIR}/results-200users.jtl" 200
print_warning "Cooling down for ${COOL_DOWN} seconds..."
sleep $COOL_DOWN

# Test 3: 300 users
run_test 300
print_summary "${RESULTS_DIR}/results-300users.jtl" 300
print_warning "Cooling down for ${COOL_DOWN} seconds..."
sleep $COOL_DOWN

# Test 4: 400 users
run_test 400
print_summary "${RESULTS_DIR}/results-400users.jtl" 400
print_warning "Cooling down for ${COOL_DOWN} seconds..."
sleep $COOL_DOWN

# Test 5: 500 users
run_test 500
print_summary "${RESULTS_DIR}/results-500users.jtl" 500

end_time=$(date +%s)
duration=$((end_time - start_time))
duration_min=$((duration / 60))

echo "=========================================="
echo "All Tests Completed!"
echo "=========================================="
echo ""
print_success "Total duration: ${duration_min} minutes ($duration seconds)"
echo ""
echo "Results Location:"
echo "  - Results files: $RESULTS_DIR/*.jtl"
echo "  - HTML reports: $RESULTS_DIR/report-*/index.html"
echo ""
echo "Next Steps:"
echo "  1. Open HTML reports in browser"
echo "  2. Compare metrics across load levels"
echo "  3. Create performance analysis graphs"
echo "  4. Document bottlenecks and recommendations"
echo ""
echo "Generate Comparison Report:"
echo "  python3 generate-comparison-report.py"
echo ""

