# Dokku Configuration

Our Digital Ocean droplet has dokku configured with 2 apps:

* demos
* node

On the server, each of these has been configured to use a specific dockerfile in this directory:

```
dokku builder-dockerfile:set demos dockerfile-path dokku/demos.dockerfile
```

To deploy a new version, run the `deploy.sh` script in the various project directories.
