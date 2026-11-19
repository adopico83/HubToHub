<?php
// Front controller. Fase 1: aquí se cargará el Router.
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['status' => 'ok', 'code' => 200, 'message' => 'HubToHub API', 'data' => null]);
