# NOVA Sales AI Health Check

## Endpoint

The application health check uses:

`GET /`

A healthy deployment should return HTTP `200`.

## Render

Render should use:

- Health Check Path: `/`
- Runtime: Docker
- Port: `10000`

## Required Environment Variable

The application requires:

`FAL_KEY`

This secret must be configured in Render and must not be committed to GitHub.
