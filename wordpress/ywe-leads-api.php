<?php
/**
 * Plugin Name: You Win Estates Leads API
 * Description: Exposes You Win Estates WordPress leads to the CRM PPC sync.
 * Version: 1.0.0
 * Author: You Win Estates
 */

if (!defined('ABSPATH')) {
    exit;
}

function ywe_leads_api_secret() {
    if (defined('YWE_WEBHOOK_SECRET') && YWE_WEBHOOK_SECRET) {
        return YWE_WEBHOOK_SECRET;
    }

    if (defined('YWE_CRM_WEBHOOK_SECRET') && YWE_CRM_WEBHOOK_SECRET) {
        return YWE_CRM_WEBHOOK_SECRET;
    }

    $env_secret = getenv('WEBHOOK_SECRET');
    if ($env_secret) {
        return $env_secret;
    }

    return get_option('ywe_webhook_secret', '');
}

function ywe_leads_api_has_access(WP_REST_Request $request) {
    $secret = ywe_leads_api_secret();
    if (!$secret) {
        return new WP_Error(
            'ywe_secret_missing',
            'YWE_WEBHOOK_SECRET or ywe_webhook_secret is not configured.',
            array('status' => 500)
        );
    }

    $provided = $request->get_header('x-webhook-secret');
    if (!$provided) {
        $provided = $request->get_param('secret');
    }

    if (!hash_equals((string) $secret, (string) $provided)) {
        return new WP_Error('ywe_forbidden', 'Forbidden.', array('status' => 403));
    }

    return true;
}

function ywe_leads_api_table_name() {
    global $wpdb;

    $configured_table = get_option('ywe_leads_table_name', '');
    if ($configured_table) {
        return $configured_table;
    }

    $candidates = array(
        $wpdb->prefix . 'ywe_leads',
        $wpdb->prefix . 'ywe_lead',
        $wpdb->prefix . 'ywe_crm_leads',
        $wpdb->prefix . 'leads',
        $wpdb->prefix . 'lead',
        'ywe_leads',
    );

    foreach ($candidates as $table) {
        $found = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($found === $table) {
            return $table;
        }
    }

    $lead_like_tables = $wpdb->get_col($wpdb->prepare('SHOW TABLES LIKE %s', '%' . $wpdb->esc_like('lead') . '%'));
    foreach ($lead_like_tables as $table) {
        if (ywe_leads_api_table_score($table) >= 3) {
            return $table;
        }
    }

    $prefixed_tables = $wpdb->get_col($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($wpdb->prefix) . '%'));
    foreach ($prefixed_tables as $table) {
        if (ywe_leads_api_table_score($table) >= 4) {
            return $table;
        }
    }

    return '';
}

function ywe_leads_api_columns($table) {
    global $wpdb;
    if (!$table) {
        return array();
    }

    $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table}", ARRAY_A);

    if (!is_array($columns)) {
        return array();
    }

    return array_map(
        function ($column) {
            return $column['Field'];
        },
        $columns
    );
}

function ywe_leads_api_table_score($table) {
    $columns = ywe_leads_api_columns($table);
    $score = 0;

    if (ywe_leads_api_first_column($columns, array('email', 'seller_email', 'sellerEmail'))) {
        $score++;
    }
    if (ywe_leads_api_first_column($columns, array('phone', 'seller_phone', 'sellerPhone'))) {
        $score++;
    }
    if (ywe_leads_api_first_column($columns, array('property_address', 'propertyAddress', 'Property Address', 'property address', 'address', 'Address', 'property'))) {
        $score++;
    }
    if (ywe_leads_api_first_column($columns, array('name', 'full_name', 'seller_name', 'sellerName'))) {
        $score++;
    }
    if (ywe_leads_api_first_column($columns, array('date', 'created_at', 'submitted_at', 'date_added'))) {
        $score++;
    }

    return $score;
}

function ywe_leads_api_first_column($columns, $names) {
    foreach ($names as $name) {
        if (in_array($name, $columns, true)) {
            return $name;
        }
    }

    return '';
}

function ywe_leads_api_value($row, $columns, $names) {
    $column = ywe_leads_api_first_column($columns, $names);
    return $column ? $row[$column] : '';
}

function ywe_leads_api_normalize_row($row, $columns) {
    $id = ywe_leads_api_value($row, $columns, array('id', 'lead_id', 'wp_lead_id'));

    return array(
        'wp_lead_id' => $id,
        'id' => $id,
        'date' => ywe_leads_api_value($row, $columns, array('Date', 'date', 'created_at', 'createdAt', 'date_added', 'submitted_at')),
        'name' => ywe_leads_api_value($row, $columns, array('Name', 'name', 'full_name', 'seller_name', 'sellerName')),
        'phone' => ywe_leads_api_value($row, $columns, array('Phone', 'phone', 'seller_phone', 'sellerPhone')),
        'email' => ywe_leads_api_value($row, $columns, array('Email', 'email', 'seller_email', 'sellerEmail')),
        'property_address' => ywe_leads_api_value($row, $columns, array('Property Address', 'property address', 'property_address', 'propertyAddress', 'Address', 'address', 'property')),
        'condition' => ywe_leads_api_value($row, $columns, array('Condition', 'condition', 'property_condition')),
        'timeline' => ywe_leads_api_value($row, $columns, array('Timeline', 'timeline', 'selling_timeline')),
        'mls_listed' => ywe_leads_api_value($row, $columns, array('MLS Listed', 'mls listed', 'mls_listed', 'mlsListed', 'on_market', 'onMarket')),
        'estimated_value' => ywe_leads_api_value($row, $columns, array('Estimated Value', 'estimated value', 'estimated_value', 'estimatedValue', 'value', 'home_value')),
        'notes' => ywe_leads_api_value($row, $columns, array('Notes', 'notes', 'message', 'comments')),
        'source' => ywe_leads_api_value($row, $columns, array('source', 'lead_source', 'utm_source')),
    );
}

function ywe_leads_api_list(WP_REST_Request $request) {
    global $wpdb;

    $table = ywe_leads_api_table_name();
    $columns = ywe_leads_api_columns($table);

    if (!$columns) {
        return new WP_Error(
            'ywe_leads_table_missing',
            'Could not find the WordPress leads table. Set wp option ywe_leads_table_name to the table that stores your lead rows.',
            array('status' => 500)
        );
    }

    $id_column = ywe_leads_api_first_column($columns, array('id', 'lead_id', 'wp_lead_id'));
    $date_column = ywe_leads_api_first_column($columns, array('date', 'created_at', 'submitted_at', 'date_added'));
    $order_column = $date_column ? $date_column : $id_column;
    $order_sql = $order_column ? " ORDER BY `{$order_column}` DESC" : '';

    $limit = absint($request->get_param('per_page'));
    if (!$limit) {
        $limit = absint($request->get_param('limit'));
    }
    if (!$limit) {
        $limit = 100;
    }
    $limit = min($limit, 500);

    $page = max(1, absint($request->get_param('page')));
    $offset = $request->get_param('offset');
    $offset = is_numeric($offset) ? max(0, absint($offset)) : (($page - 1) * $limit);

    $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
    $rows = $wpdb->get_results(
        $wpdb->prepare("SELECT * FROM {$table}{$order_sql} LIMIT %d OFFSET %d", $limit, $offset),
        ARRAY_A
    );

    $leads = array_map(
        function ($row) use ($columns) {
            return ywe_leads_api_normalize_row($row, $columns);
        },
        is_array($rows) ? $rows : array()
    );

    $response = rest_ensure_response(array('leads' => $leads, 'total' => $total));
    $response->header('X-WP-Total', $total);
    $response->header('X-WP-TotalPages', $limit ? ceil($total / $limit) : 1);

    return $response;
}

function ywe_leads_api_delete_by_id(WP_REST_Request $request) {
    global $wpdb;

    $table = ywe_leads_api_table_name();
    $columns = ywe_leads_api_columns($table);
    $id_column = ywe_leads_api_first_column($columns, array('id', 'lead_id', 'wp_lead_id'));

    if (!$id_column) {
        return new WP_Error(
            'ywe_id_column_missing',
            'Could not find a lead ID column.',
            array('status' => 500)
        );
    }

    $lead_id = $request->get_param('id');
    $deleted = $wpdb->delete($table, array($id_column => $lead_id), array('%s'));

    if (!$deleted) {
        return new WP_Error('ywe_lead_not_found', 'Lead not found.', array('status' => 404));
    }

    return rest_ensure_response(array('success' => true, 'deleted' => $deleted));
}

function ywe_leads_api_delete_by_email(WP_REST_Request $request) {
    global $wpdb;

    $table = ywe_leads_api_table_name();
    $columns = ywe_leads_api_columns($table);
    $email_column = ywe_leads_api_first_column($columns, array('email', 'seller_email', 'sellerEmail'));

    if (!$email_column) {
        return new WP_Error(
            'ywe_email_column_missing',
            'Could not find a lead email column.',
            array('status' => 500)
        );
    }

    $email = sanitize_email($request->get_param('email'));
    if (!$email) {
        $body = json_decode($request->get_body(), true);
        $email = sanitize_email(is_array($body) && isset($body['email']) ? $body['email'] : '');
    }

    if (!$email) {
        return new WP_Error('ywe_email_required', 'email required.', array('status' => 400));
    }

    $deleted = $wpdb->delete($table, array($email_column => $email), array('%s'));

    if (!$deleted) {
        return new WP_Error('ywe_lead_not_found', 'Lead not found.', array('status' => 404));
    }

    return rest_ensure_response(array('success' => true, 'deleted' => $deleted));
}

add_action('rest_api_init', function () {
    register_rest_route('ywe/v1', '/leads', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'ywe_leads_api_list',
        'permission_callback' => 'ywe_leads_api_has_access',
    ));

    register_rest_route('ywe/v1', '/lead/(?P<id>[^/]+)', array(
        'methods' => WP_REST_Server::DELETABLE,
        'callback' => 'ywe_leads_api_delete_by_id',
        'permission_callback' => 'ywe_leads_api_has_access',
        'args' => array(
            'id' => array('required' => true),
        ),
    ));

    register_rest_route('ywe/v1', '/lead-by-email', array(
        'methods' => WP_REST_Server::DELETABLE,
        'callback' => 'ywe_leads_api_delete_by_email',
        'permission_callback' => 'ywe_leads_api_has_access',
    ));
});
