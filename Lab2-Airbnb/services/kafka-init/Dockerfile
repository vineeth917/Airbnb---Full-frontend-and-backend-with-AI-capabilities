FROM confluentinc/cp-kafka:7.5.0

USER root

# Copy the initialization script
COPY init-topics.sh /usr/local/bin/init-topics.sh

# Make the script executable
RUN chmod +x /usr/local/bin/init-topics.sh

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/init-topics.sh"]

