#!/usr/bin/env python3
"""
Generate Performance Comparison Report from JMeter Results
Lab 2 Airbnb - Distributed Systems

This script analyzes JMeter .jtl result files and generates:
1. CSV summary of all test runs
2. Comparison graphs
3. Performance analysis
"""

import csv
import json
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from collections import defaultdict

# Configuration
RESULTS_DIR = Path("results")
USER_LEVELS = [100, 200, 300, 400, 500]
OUTPUT_DIR = Path("analysis")

def parse_jtl_file(filepath):
    """Parse JMeter JTL results file"""
    response_times = []
    errors = 0
    total_bytes = 0
    timestamps = []
    
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                response_time = int(row['elapsed'])
                response_times.append(response_time)
                
                success = row['success'] == 'true'
                if not success:
                    errors += 1
                
                if 'bytes' in row:
                    total_bytes += int(row['bytes'])
                
                timestamps.append(int(row['timeStamp']))
            except (KeyError, ValueError) as e:
                print(f"Warning: Skipping row due to error: {e}")
                continue
    
    return {
        'response_times': response_times,
        'errors': errors,
        'total_requests': len(response_times),
        'total_bytes': total_bytes,
        'timestamps': timestamps
    }

def calculate_percentile(data, percentile):
    """Calculate percentile of data"""
    return np.percentile(data, percentile)

def calculate_throughput(data):
    """Calculate throughput (requests/second)"""
    if not data['timestamps']:
        return 0
    
    start_time = min(data['timestamps']) / 1000  # Convert to seconds
    end_time = max(data['timestamps']) / 1000
    duration = end_time - start_time
    
    if duration == 0:
        return 0
    
    return data['total_requests'] / duration

def analyze_results(user_level):
    """Analyze results for a specific user level"""
    results_file = RESULTS_DIR / f"results-{user_level}users.jtl"
    
    if not results_file.exists():
        print(f"Warning: Results file not found: {results_file}")
        return None
    
    data = parse_jtl_file(results_file)
    
    if not data['response_times']:
        print(f"Warning: No data found in {results_file}")
        return None
    
    response_times = data['response_times']
    
    analysis = {
        'users': user_level,
        'total_requests': data['total_requests'],
        'errors': data['errors'],
        'error_rate': (data['errors'] / data['total_requests'] * 100) if data['total_requests'] > 0 else 0,
        'avg_response_time': np.mean(response_times),
        'median_response_time': np.median(response_times),
        'min_response_time': np.min(response_times),
        'max_response_time': np.max(response_times),
        'p50': calculate_percentile(response_times, 50),
        'p90': calculate_percentile(response_times, 90),
        'p95': calculate_percentile(response_times, 95),
        'p99': calculate_percentile(response_times, 99),
        'std_dev': np.std(response_times),
        'throughput': calculate_throughput(data),
        'total_bytes': data['total_bytes'],
    }
    
    return analysis

def generate_summary_table(all_results):
    """Generate CSV summary table"""
    OUTPUT_DIR.mkdir(exist_ok=True)
    output_file = OUTPUT_DIR / "performance-summary.csv"
    
    with open(output_file, 'w', newline='') as f:
        fieldnames = ['users', 'total_requests', 'errors', 'error_rate', 
                      'avg_response_time', 'p90', 'p95', 'p99', 'throughput']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        writer.writeheader()
        for result in all_results:
            writer.writerow({
                'users': result['users'],
                'total_requests': result['total_requests'],
                'errors': result['errors'],
                'error_rate': f"{result['error_rate']:.2f}%",
                'avg_response_time': f"{result['avg_response_time']:.2f}ms",
                'p90': f"{result['p90']:.2f}ms",
                'p95': f"{result['p95']:.2f}ms",
                'p99': f"{result['p99']:.2f}ms",
                'throughput': f"{result['throughput']:.2f} req/s",
            })
    
    print(f"✓ Summary table saved to: {output_file}")

def plot_response_time_comparison(all_results):
    """Plot response time comparison graph"""
    users = [r['users'] for r in all_results]
    avg_times = [r['avg_response_time'] for r in all_results]
    p90_times = [r['p90'] for r in all_results]
    p95_times = [r['p95'] for r in all_results]
    p99_times = [r['p99'] for r in all_results]
    
    plt.figure(figsize=(12, 6))
    plt.plot(users, avg_times, marker='o', label='Average', linewidth=2)
    plt.plot(users, p90_times, marker='s', label='90th Percentile', linewidth=2)
    plt.plot(users, p95_times, marker='^', label='95th Percentile', linewidth=2)
    plt.plot(users, p99_times, marker='d', label='99th Percentile', linewidth=2)
    
    plt.xlabel('Concurrent Users', fontsize=12)
    plt.ylabel('Response Time (ms)', fontsize=12)
    plt.title('Response Time vs. Concurrent Users', fontsize=14, fontweight='bold')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    output_file = OUTPUT_DIR / "response-time-comparison.png"
    plt.savefig(output_file, dpi=300)
    print(f"✓ Response time graph saved to: {output_file}")
    plt.close()

def plot_throughput_comparison(all_results):
    """Plot throughput comparison graph"""
    users = [r['users'] for r in all_results]
    throughput = [r['throughput'] for r in all_results]
    
    plt.figure(figsize=(10, 6))
    plt.bar(users, throughput, width=40, color='steelblue', alpha=0.7)
    plt.xlabel('Concurrent Users', fontsize=12)
    plt.ylabel('Throughput (requests/second)', fontsize=12)
    plt.title('Throughput vs. Concurrent Users', fontsize=14, fontweight='bold')
    plt.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    
    output_file = OUTPUT_DIR / "throughput-comparison.png"
    plt.savefig(output_file, dpi=300)
    print(f"✓ Throughput graph saved to: {output_file}")
    plt.close()

def plot_error_rate_comparison(all_results):
    """Plot error rate comparison graph"""
    users = [r['users'] for r in all_results]
    error_rates = [r['error_rate'] for r in all_results]
    
    plt.figure(figsize=(10, 6))
    bars = plt.bar(users, error_rates, width=40, alpha=0.7)
    
    # Color bars based on error rate (green < 1%, yellow 1-5%, red > 5%)
    for i, bar in enumerate(bars):
        if error_rates[i] < 1:
            bar.set_color('green')
        elif error_rates[i] < 5:
            bar.set_color('orange')
        else:
            bar.set_color('red')
    
    plt.xlabel('Concurrent Users', fontsize=12)
    plt.ylabel('Error Rate (%)', fontsize=12)
    plt.title('Error Rate vs. Concurrent Users', fontsize=14, fontweight='bold')
    plt.axhline(y=1, color='r', linestyle='--', label='1% threshold')
    plt.legend()
    plt.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    
    output_file = OUTPUT_DIR / "error-rate-comparison.png"
    plt.savefig(output_file, dpi=300)
    print(f"✓ Error rate graph saved to: {output_file}")
    plt.close()

def generate_analysis_report(all_results):
    """Generate text analysis report"""
    output_file = OUTPUT_DIR / "performance-analysis.txt"
    
    with open(output_file, 'w') as f:
        f.write("=" * 80 + "\n")
        f.write("Lab2 Airbnb - Performance Test Analysis Report\n")
        f.write("=" * 80 + "\n\n")
        
        f.write("Test Summary\n")
        f.write("-" * 80 + "\n")
        for result in all_results:
            f.write(f"\n{result['users']} Concurrent Users:\n")
            f.write(f"  Total Requests: {result['total_requests']}\n")
            f.write(f"  Errors: {result['errors']} ({result['error_rate']:.2f}%)\n")
            f.write(f"  Avg Response Time: {result['avg_response_time']:.2f}ms\n")
            f.write(f"  90th Percentile: {result['p90']:.2f}ms\n")
            f.write(f"  95th Percentile: {result['p95']:.2f}ms\n")
            f.write(f"  99th Percentile: {result['p99']:.2f}ms\n")
            f.write(f"  Throughput: {result['throughput']:.2f} req/s\n")
        
        f.write("\n\n")
        f.write("Performance Analysis\n")
        f.write("-" * 80 + "\n\n")
        
        # Analyze response time trend
        f.write("1. Response Time Trend:\n")
        first_avg = all_results[0]['avg_response_time']
        last_avg = all_results[-1]['avg_response_time']
        increase = ((last_avg - first_avg) / first_avg) * 100
        f.write(f"   Response time increased by {increase:.1f}% from 100 to 500 users\n")
        f.write(f"   ({first_avg:.2f}ms -> {last_avg:.2f}ms)\n\n")
        
        # Analyze throughput
        f.write("2. Throughput Analysis:\n")
        first_throughput = all_results[0]['throughput']
        last_throughput = all_results[-1]['throughput']
        throughput_increase = ((last_throughput - first_throughput) / first_throughput) * 100
        f.write(f"   Throughput increased by {throughput_increase:.1f}% from 100 to 500 users\n")
        f.write(f"   ({first_throughput:.2f} -> {last_throughput:.2f} req/s)\n\n")
        
        # Analyze errors
        f.write("3. Error Analysis:\n")
        max_error_rate = max(r['error_rate'] for r in all_results)
        if max_error_rate < 1:
            f.write("   ✓ Excellent: All error rates below 1%\n")
        elif max_error_rate < 5:
            f.write("   ⚠ Warning: Some error rates above 1%\n")
        else:
            f.write("   ✗ Critical: Error rates above 5% detected\n")
        f.write(f"   Maximum error rate: {max_error_rate:.2f}%\n\n")
        
        # Recommendations
        f.write("4. Recommendations:\n")
        if last_avg > 1000:
            f.write("   - High response times detected. Consider:\n")
            f.write("     • Increasing service replicas\n")
            f.write("     • Adding database indexes\n")
            f.write("     • Implementing caching\n")
        if max_error_rate > 1:
            f.write("   - Errors detected. Investigate:\n")
            f.write("     • Connection pool settings\n")
            f.write("     • Resource limits\n")
            f.write("     • Service health checks\n")
        if throughput_increase < 200:
            f.write("   - Throughput not scaling linearly. Consider:\n")
            f.write("     • Horizontal pod autoscaling\n")
            f.write("     • Load balancer configuration\n")
            f.write("     • Database connection pooling\n")
    
    print(f"✓ Analysis report saved to: {output_file}")

def main():
    print("=" * 80)
    print("Lab2 Airbnb - Performance Test Analysis")
    print("=" * 80)
    print()
    
    # Analyze results for all user levels
    all_results = []
    for users in USER_LEVELS:
        print(f"Analyzing results for {users} concurrent users...")
        result = analyze_results(users)
        if result:
            all_results.append(result)
    
    if not all_results:
        print("\n✗ No results found. Please run JMeter tests first.")
        return
    
    print(f"\n✓ Analyzed {len(all_results)} test runs")
    print()
    
    # Generate outputs
    print("Generating reports...")
    generate_summary_table(all_results)
    plot_response_time_comparison(all_results)
    plot_throughput_comparison(all_results)
    plot_error_rate_comparison(all_results)
    generate_analysis_report(all_results)
    
    print()
    print("=" * 80)
    print("Analysis Complete!")
    print("=" * 80)
    print()
    print(f"Output files saved to: {OUTPUT_DIR}/")
    print("  - performance-summary.csv")
    print("  - response-time-comparison.png")
    print("  - throughput-comparison.png")
    print("  - error-rate-comparison.png")
    print("  - performance-analysis.txt")
    print()

if __name__ == "__main__":
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("Error: Required packages not installed.")
        print("Install with: pip install matplotlib numpy")
        exit(1)
    
    main()

