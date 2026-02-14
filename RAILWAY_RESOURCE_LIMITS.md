# Railway Resource Limits and Cost Optimization

This document explains Railway's pricing tiers, resource constraints for the Hobby plan, and optimization strategies to stay within the $5/month budget.

---

## Railway Pricing Tiers (as of 2024)

### Free Trial
- **Cost**: $0 (one-time $5 credit)
- **Resources**: Limited to trial credit
- **Best for**: Testing and evaluation only

### Hobby Plan
- **Cost**: $5/month base + usage
- **Included**: $5 of usage credit
- **Memory**: Up to 8 GB per service
- **CPU**: Shared vCPU
- **Storage**: 100 GB total
- **Bandwidth**: Unlimited
- **Best for**: Small production apps, side projects, 1-5 restaurant clients

### Pro Plan
- **Cost**: $20/month base + usage
- **Included**: $20 of usage credit
- **Memory**: Up to 32 GB per service
- **CPU**: Dedicated vCPU options
- **Storage**: 100 GB total (expandable)
- **Bandwidth**: Unlimited
- **Priority Support**: Yes
- **Best for**: Growing businesses, 5-20 restaurant clients

---

## Understanding Railway Usage Costs

Railway charges for **actual resource usage** beyond the included credit:

**Memory**: ~$0.000231 per GB-hour
- 512 MB constant usage = ~$3.50/month
- 1 GB constant usage = ~$7/month

**CPU**: ~$0.000463 per vCPU-hour
- 0.5 vCPU constant usage = ~$5.50/month
- 1 vCPU constant usage = ~$11/month

**Example Hobby Plan Usage**:
- 512 MB memory + 0.5 vCPU = ~$9/month total
- With $5 included credit = **$4/month out of pocket**
- Stays within budget! ✅

---

## Resource Constraints in railway.json

The `railway.json` file now includes resource limits optimized for the Hobby plan:

```json
{
  "deploy": {
    "resources": {
      "memory": "512Mi",
      "cpu": "0.5"
    }
  }
}
```

**What this means**:
- **Memory**: 512 MB maximum (prevents exceeding budget)
- **CPU**: 0.5 vCPU (half a virtual CPU core)
- **Cost**: ~$9/month total, $4/month after $5 credit

---

## Staying Within $5/Month Budget

To stay within the Hobby plan's $5/month budget (using only the included credit), you need to optimize resource usage:

### Option 1: Reduce Resource Limits (Tight Budget)
```json
{
  "resources": {
    "memory": "256Mi",
    "cpu": "0.25"
  }
}
```
- **Cost**: ~$4.50/month total
- **After credit**: $0/month out of pocket ✅
- **Trade-off**: Slower performance, may struggle with traffic spikes
- **Best for**: Very low traffic (< 100 orders/month)

### Option 2: Current Configuration (Recommended)
```json
{
  "resources": {
    "memory": "512Mi",
    "cpu": "0.5"
  }
}
```
- **Cost**: ~$9/month total
- **After credit**: $4/month out of pocket
- **Trade-off**: Good performance for small-medium traffic
- **Best for**: 1-3 restaurant clients, moderate traffic

### Option 3: Higher Performance (Growing Business)
```json
{
  "resources": {
    "memory": "1024Mi",
    "cpu": "1"
  }
}
```
- **Cost**: ~$18/month total
- **After credit**: $13/month out of pocket
- **Trade-off**: Better performance, higher cost
- **Best for**: 3-5 restaurant clients, higher traffic
- **Recommendation**: Upgrade to Pro plan ($20/month) for better value

---

## Database Costs

Railway MySQL pricing:
- **Included**: 100 MB storage free
- **Additional storage**: ~$0.25 per GB-month
- **Typical usage**: 500 MB = ~$0.10/month

**Cost optimization**:
- Use external database (PlanetScale free tier: 5 GB storage, 1 billion row reads/month)
- Archive old orders regularly
- Optimize images before uploading

---

## Application Optimization Tips

### 1. Memory Optimization

**Current optimizations in Dockerfile**:
- Multi-stage build (reduces image size by 70%)
- Production dependencies only (no dev tools)
- Optimized Node.js flags (automatic garbage collection)

**Additional optimizations**:
```javascript
// In server code, limit concurrent operations
const MAX_CONCURRENT_REQUESTS = 10;

// Use streaming for large responses
res.setHeader('Content-Type', 'application/json');
res.write(JSON.stringify(data));
res.end();
```

### 2. CPU Optimization

**Avoid CPU-intensive operations**:
- ❌ Image processing in-app (use Cloudinary or similar)
- ❌ PDF generation on every request (cache PDFs)
- ❌ Complex analytics calculations (pre-compute and cache)

**Use efficient queries**:
- ✅ Add database indexes for common queries
- ✅ Limit result sets (pagination)
- ✅ Cache frequently accessed data (menu items, settings)

### 3. Bandwidth Optimization

**Bandwidth is unlimited on Railway**, but optimizing still helps:
- Compress images before uploading (use Sharp)
- Enable gzip compression (already enabled in Express)
- Use CDN for static assets (Cloudflare free tier)

---

## Monitoring Resource Usage

### Railway Dashboard
1. Go to your project in Railway
2. Click on your service
3. Go to "Metrics" tab
4. Monitor:
   - Memory usage (should stay under 512 MB)
   - CPU usage (should average < 50%)
   - Request count and response times

### Set Up Alerts
1. In Railway dashboard, go to "Settings"
2. Add email for usage alerts
3. Set alert threshold at $4 (before exceeding budget)

### Check Usage Regularly
- Weekly: Review metrics to spot trends
- Monthly: Check invoice to verify costs
- Optimize: Adjust resources if consistently under/over-utilized

---

## Scaling Strategies

### When to Scale Up

**Signs you need more resources**:
- Memory usage consistently > 80%
- CPU usage consistently > 70%
- Slow response times (> 2 seconds)
- Application crashes or restarts frequently
- More than 3 restaurant clients

**Scaling options**:
1. **Increase resources** (memory to 1 GB, CPU to 1.0)
2. **Upgrade to Pro plan** ($20/month for better value)
3. **Optimize code** (caching, query optimization)
4. **Use external services** (Cloudinary for images, Redis for caching)

### Horizontal Scaling

For high traffic, run multiple instances:
```json
{
  "deploy": {
    "numReplicas": 2,
    "resources": {
      "memory": "512Mi",
      "cpu": "0.5"
    }
  }
}
```
- **Cost**: Doubles (2x $9 = $18/month)
- **Benefit**: High availability, load distribution
- **When**: > 5 restaurant clients or high traffic

---

## Cost Comparison: Railway vs Alternatives

### Railway Hobby ($5/month)
- ✅ Easy deployment
- ✅ Automatic HTTPS
- ✅ Built-in monitoring
- ✅ MySQL included
- ❌ Limited resources

### Vercel ($0 - $20/month)
- ✅ Free tier generous
- ✅ Global CDN
- ❌ Serverless only (no persistent connections)
- ❌ Database separate cost

### DigitalOcean Droplet ($6/month)
- ✅ Full control
- ✅ More resources (1 GB RAM, 1 vCPU)
- ❌ Manual setup and maintenance
- ❌ No automatic deployments

### Render ($7/month)
- ✅ Similar to Railway
- ✅ Free tier available
- ❌ Slower cold starts
- ❌ Less intuitive UI

**Recommendation**: Railway Hobby is excellent for getting started. Upgrade to Pro or move to VPS when serving 5+ clients.

---

## Budget Planning

### Single Restaurant Client
- **Railway**: $5-9/month (Hobby plan)
- **Database**: $0 (PlanetScale free tier)
- **Email**: $0 (Resend free tier: 3,000 emails/month)
- **Stripe**: 2.9% + 30¢ per transaction
- **Total**: ~$5-9/month fixed cost

### 3-5 Restaurant Clients
- **Railway**: $20/month (Pro plan recommended)
- **Database**: $5-10/month (PlanetScale Scaler or Railway MySQL)
- **Email**: $0-10/month (Resend: 3,000-50,000 emails)
- **Stripe**: Per-transaction fees
- **Total**: ~$25-40/month fixed cost

### 10+ Restaurant Clients
- **Railway**: $20-50/month (Pro plan with higher resources)
- **Database**: $15-30/month (dedicated database)
- **Email**: $20/month (Resend Pro)
- **CDN**: $0 (Cloudflare free tier)
- **Monitoring**: $0-20/month (optional)
- **Total**: ~$55-120/month fixed cost

---

## Recommended Configuration for $5/Month Budget

If you absolutely must stay within $5/month (using only included credit):

**1. Use minimal resources**:
```json
{
  "resources": {
    "memory": "256Mi",
    "cpu": "0.25"
  }
}
```

**2. Use external free services**:
- **Database**: PlanetScale free tier (5 GB)
- **Email**: Resend free tier (3,000 emails/month)
- **Storage**: Cloudflare R2 free tier (10 GB)
- **CDN**: Cloudflare free tier

**3. Optimize aggressively**:
- Cache everything possible
- Minimize database queries
- Use lazy loading for images
- Implement request throttling

**4. Accept limitations**:
- Slower response times
- May struggle with traffic spikes
- Limited to 1-2 restaurant clients
- No high-resolution image uploads

**Reality check**: For a production restaurant application serving real customers, the $5/month budget is very tight. Budget $10-20/month for reliable performance.

---

## Summary

**Current Configuration (Recommended)**:
- Memory: 512 MB
- CPU: 0.5 vCPU
- Cost: ~$9/month ($4 out of pocket after $5 credit)
- Suitable for: 1-3 restaurant clients with moderate traffic

**To stay within $5/month** (using only included credit):
- Reduce to 256 MB memory + 0.25 vCPU
- Use external free services (PlanetScale, Cloudflare)
- Accept performance trade-offs
- Limit to 1 restaurant client with low traffic

**For growth** (5+ clients):
- Upgrade to Pro plan ($20/month)
- Increase resources (1 GB memory, 1 vCPU)
- Consider dedicated database
- Implement caching and CDN

Monitor your usage closely in the first month to find the right balance between cost and performance for your specific use case.
