#!/bin/bash

# Kafka Topics Initialization Script
# Creates all required topics for the Airbnb Lab2 application

echo "========================================="
echo "Kafka Topics Initialization"
echo "========================================="
echo ""

# Wait for Kafka to be ready
echo "Waiting for Kafka to be ready..."
sleep 30

KAFKA_BROKER="kafka:9092"

# Function to create a topic
create_topic() {
    local topic_name=$1
    local partitions=$2
    local replication=$3
    
    echo "Creating topic: $topic_name (Partitions: $partitions, Replication: $replication)"
    
    kafka-topics --create \
        --bootstrap-server $KAFKA_BROKER \
        --topic $topic_name \
        --partitions $partitions \
        --replication-factor $replication \
        --if-not-exists \
        --config retention.ms=604800000 \
        --config segment.ms=86400000
    
    if [ $? -eq 0 ]; then
        echo "✓ Topic '$topic_name' created successfully"
    else
        echo "✗ Failed to create topic '$topic_name'"
    fi
    echo ""
}

# Create Kafka Topics
echo "Creating Kafka topics..."
echo ""

# Booking flow topics
create_topic "booking-requests" 3 1
create_topic "booking-updates" 3 1
create_topic "booking-confirmations" 3 1
create_topic "booking-cancellations" 3 1

# Notification topics
create_topic "user-notifications" 3 1

# Analytics topics (optional)
create_topic "property-views" 3 1
create_topic "search-queries" 3 1

echo "========================================="
echo "Topic Creation Complete"
echo "========================================="
echo ""

# List all topics
echo "Available Kafka topics:"
kafka-topics --list --bootstrap-server $KAFKA_BROKER

echo ""
echo "Describing topics:"
kafka-topics --describe --bootstrap-server $KAFKA_BROKER

echo ""
echo "========================================="
echo "Initialization Complete"
echo "========================================="

