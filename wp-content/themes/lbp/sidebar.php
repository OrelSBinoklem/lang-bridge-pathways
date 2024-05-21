<aside class="site-sidebar">
    <?php if (is_active_sidebar('sidebar-1')) : ?>
        <?php dynamic_sidebar('sidebar-1'); ?>
    <?php else : ?>
        <p>Sidebar is not active.</p>
    <?php endif; ?>
</aside>
