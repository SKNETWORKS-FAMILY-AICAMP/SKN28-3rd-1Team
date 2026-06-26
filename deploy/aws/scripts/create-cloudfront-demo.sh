#!/bin/sh
set -eu

AWS_PROFILE="${AWS_PROFILE:-sknetworksTeam3}"
ALB_DNS="${ALB_DNS:-skn28-demo-alb-1645582252.us-east-1.elb.amazonaws.com}"
COMMENT="${COMMENT:-SKN28 demo HTTPS frontend}"
ORIGIN_ID="${ORIGIN_ID:-skn28-demo-alb}"
CACHE_POLICY_ID="${CACHE_POLICY_ID:-4135ea2d-6df8-44a3-9df3-4b5a84be39ad}"
ORIGIN_REQUEST_POLICY_ID="${ORIGIN_REQUEST_POLICY_ID:-b689b0a8-53d0-40ab-baf2-68738e2966ac}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

existing_id="$(aws cloudfront list-distributions \
  --profile "$AWS_PROFILE" \
  --query 'DistributionList.Items[?Comment==`'"$COMMENT"'`].Id | [0]' \
  --output text 2>/dev/null || true)"

if [ -n "$existing_id" ] && [ "$existing_id" != "None" ]; then
  aws cloudfront get-distribution \
    --profile "$AWS_PROFILE" \
    --id "$existing_id" \
    --query 'Distribution.{Id:Id,DomainName:DomainName,Status:Status}' \
    --output json
  exit 0
fi

distribution_config="$TMP_DIR/distribution-config.json"
cat > "$distribution_config" <<JSON
{
  "CallerReference": "skn28-demo-$(date +%s)",
  "Comment": "${COMMENT}",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "${ORIGIN_ID}",
        "DomainName": "${ALB_DNS}",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          },
          "OriginReadTimeout": 60,
          "OriginKeepaliveTimeout": 5
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "${ORIGIN_ID}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "CachePolicyId": "${CACHE_POLICY_ID}",
    "OriginRequestPolicyId": "${ORIGIN_REQUEST_POLICY_ID}"
  },
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true
}
JSON

aws cloudfront create-distribution \
  --profile "$AWS_PROFILE" \
  --distribution-config "file://$distribution_config" \
  --query 'Distribution.{Id:Id,DomainName:DomainName,Status:Status}' \
  --output json
