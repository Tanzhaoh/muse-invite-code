FROM ghcr.io/xtls/xray-core:latest AS xray
FROM alpine:latest
COPY --from=xray /usr/local/bin/xray /usr/local/bin/xray
COPY --from=xray /usr/local/share/xray/ /usr/local/share/xray/
COPY config.json /etc/xray/config.json
EXPOSE 3000
CMD ["xray", "run", "-c", "/etc/xray/config.json"]
