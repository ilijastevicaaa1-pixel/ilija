# TODO

## Step 1: Patch login.js
- [x] Update `backend/routes/login.js` to use safe secret sourcing (fallback to `dev_secret_key` if missing)
- [x] Add explicit runtime validation + clear error handling if secret is missing

## Step 2: Push redeploy
- [x] Commit changes
- [ ] Push to the repo
- [ ] Trigger Render Deploy latest commit or Restart service

## Step 3: Verify
- [ ] Confirm logs no longer show: `secretOrPrivateKey must have a value`
- [ ] Verify frontend login returns token
- [ ] Verify auth-protected routes work

